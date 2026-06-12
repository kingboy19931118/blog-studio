[CmdletBinding()]
param(
    [string]$SourceRoot = "I:\Dev\Repos\ai_scripts\articles\ai-agent",
    [string]$BaseUrl = "http://121.40.157.44",
    [string]$Username = "admin",
    [string]$Password,
    [ValidateSet("draft", "published")]
    [string]$Status = "draft",
    [switch]$DryRun,
    [switch]$UpdateExisting
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Net.Http

function Get-ArticleSource {
    param([System.IO.DirectoryInfo]$Directory)

    $markdown = Get-ChildItem -LiteralPath $Directory.FullName -File -Filter "*.md" |
        Where-Object { $_.Name -notmatch "formatted" } |
        Select-Object -First 1
    if (-not $markdown) {
        throw "No Markdown file found in $($Directory.FullName)"
    }

    $content = Get-Content -LiteralPath $markdown.FullName -Raw -Encoding UTF8
    $titleMatch = [regex]::Match($content, "(?m)^#\s+(.+)$")
    if (-not $titleMatch.Success) {
        throw "No H1 title found in $($markdown.FullName)"
    }

    $metadataPath = Join-Path $Directory.FullName "metadata.json"
    $metadata = if (Test-Path -LiteralPath $metadataPath) {
        Get-Content -LiteralPath $metadataPath -Raw -Encoding UTF8 | ConvertFrom-Json
    } else {
        $null
    }

    $summary = if ($metadata -and $metadata.digest) {
        [string]$metadata.digest
    } else {
        $quoteMatch = [regex]::Match($content, "(?m)^>\s+(.+)$")
        if ($quoteMatch.Success) { $quoteMatch.Groups[1].Value } else { "" }
    }

    $cover = Get-ChildItem -LiteralPath $Directory.FullName -File -Filter "*.png" |
        Select-Object -First 1

    $imageMatches = [regex]::Matches($content, "!\[[^\]]*\]\(([^)]+)\)")
    $images = foreach ($match in $imageMatches) {
        $relativePath = $match.Groups[1].Value
        if ($relativePath -match "^https?://") {
            continue
        }

        $fullPath = [System.IO.Path]::GetFullPath((Join-Path $Directory.FullName $relativePath))
        if (-not (Test-Path -LiteralPath $fullPath)) {
            throw "Referenced image does not exist: $fullPath"
        }

        [pscustomobject]@{
            RelativePath = $relativePath
            FullPath     = $fullPath
        }
    }

    if (-not $cover -and $images.Count -gt 0) {
        $cover = Get-Item -LiteralPath $images[0].FullPath
    }

    [pscustomobject]@{
        Directory = $Directory
        Markdown  = $markdown
        Title     = $titleMatch.Groups[1].Value.Trim()
        Summary   = $summary.Trim()
        Content   = $content
        Cover     = $cover
        Images    = @($images)
    }
}

function Invoke-ApiJson {
    param(
        [ValidateSet("GET", "POST", "PUT")]
        [string]$Method,
        [string]$Path,
        [object]$Body,
        [string]$Token
    )

    $headers = @{}
    if ($Token) {
        $headers.Authorization = "Bearer $Token"
    }

    $params = @{
        Uri         = "$BaseUrl$Path"
        Method      = $Method
        Headers     = $headers
        TimeoutSec  = 30
        ErrorAction = "Stop"
    }
    if ($null -ne $Body) {
        $params.ContentType = "application/json; charset=utf-8"
        $params.Body = $Body | ConvertTo-Json -Depth 8 -Compress
    }

    Invoke-RestMethod @params
}

function Send-Image {
    param(
        [string]$Path,
        [string]$Token
    )

    $client = [System.Net.Http.HttpClient]::new()
    $client.Timeout = [TimeSpan]::FromSeconds(60)
    $client.DefaultRequestHeaders.Authorization =
        [System.Net.Http.Headers.AuthenticationHeaderValue]::new("Bearer", $Token)

    $form = [System.Net.Http.MultipartFormDataContent]::new()
    $stream = [System.IO.File]::OpenRead($Path)
    try {
        $fileContent = [System.Net.Http.StreamContent]::new($stream)
        $fileContent.Headers.ContentType =
            [System.Net.Http.Headers.MediaTypeHeaderValue]::new("application/octet-stream")
        $form.Add($fileContent, "file", [System.IO.Path]::GetFileName($Path))

        $response = $client.PostAsync("$BaseUrl/api/upload", $form).GetAwaiter().GetResult()
        $responseBody = $response.Content.ReadAsStringAsync().GetAwaiter().GetResult()
        if (-not $response.IsSuccessStatusCode) {
            throw "Upload failed for ${Path}: HTTP $([int]$response.StatusCode) $responseBody"
        }
        ($responseBody | ConvertFrom-Json).url
    } finally {
        $stream.Dispose()
        $form.Dispose()
        $client.Dispose()
    }
}

if (-not (Test-Path -LiteralPath $SourceRoot)) {
    throw "Source directory does not exist: $SourceRoot"
}

$directories = Get-ChildItem -LiteralPath $SourceRoot -Directory -Filter "chapter-*" |
    Sort-Object Name
if ($directories.Count -ne 16) {
    throw "Expected 16 chapter directories, found $($directories.Count)"
}

$articles = @($directories | ForEach-Object { Get-ArticleSource -Directory $_ })

Write-Host "Validated $($articles.Count) articles:" -ForegroundColor Cyan
foreach ($article in $articles) {
    Write-Host ("  {0}: {1} ({2} images)" -f
        $article.Directory.Name, $article.Title, $article.Images.Count)
}

if ($DryRun) {
    Write-Host "Dry run complete. No API calls were made." -ForegroundColor Green
    exit 0
}

if (-not $Password) {
    $securePassword = Read-Host "Admin password" -AsSecureString
    $credential = [System.Net.NetworkCredential]::new("", $securePassword)
    $Password = $credential.Password
}

$login = Invoke-ApiJson -Method POST -Path "/api/auth/login" -Body @{
    username = $Username
    password = $Password
}
$token = $login.token
if (-not $token) {
    throw "Login succeeded without returning a token"
}

$categories = @(Invoke-ApiJson -Method GET -Path "/api/categories" -Body $null)
$category = $categories | Where-Object { $_.name -eq "AI Agent" } | Select-Object -First 1
if (-not $category) {
    $category = Invoke-ApiJson -Method POST -Path "/api/categories" -Token $token -Body @{
        name  = "AI Agent"
        color = "#4f46e5"
    }
    Write-Host "Created category: AI Agent" -ForegroundColor Green
}

$existingResponse = Invoke-ApiJson -Method GET -Path "/api/posts?status=all&page_size=100" -Body $null -Token $token
$existingByTitle = @{}
foreach ($post in @($existingResponse.posts)) {
    $existingByTitle[$post.title] = $post
}

$created = 0
$updated = 0
$skipped = 0

foreach ($article in $articles) {
    $existing = $existingByTitle[$article.Title]
    if ($existing -and -not $UpdateExisting) {
        Write-Host "Skip existing: $($article.Title)" -ForegroundColor Yellow
        $skipped++
        continue
    }

    Write-Host "Importing: $($article.Title)" -ForegroundColor Cyan
    $rewrittenContent = $article.Content
    $uploadedByPath = @{}

    $existingImageUrls = @()
    if ($existing -and $UpdateExisting) {
        $existingImageUrls = @(
            [regex]::Matches(
                [string]$existing.content,
                "!\[[^\]]*\]\((/uploads/[^)]+)\)"
            ) | ForEach-Object { $_.Groups[1].Value }
        )
        if ($existingImageUrls.Count -eq $article.Images.Count) {
            for ($i = 0; $i -lt $article.Images.Count; $i++) {
                $uploadedByPath[$article.Images[$i].FullPath] = $existingImageUrls[$i]
            }
        }
    }

    foreach ($image in $article.Images) {
        if (-not $uploadedByPath.ContainsKey($image.FullPath)) {
            $uploadedByPath[$image.FullPath] = Send-Image -Path $image.FullPath -Token $token
        }
        $rewrittenContent = $rewrittenContent.Replace(
            "($($image.RelativePath))",
            "($($uploadedByPath[$image.FullPath]))"
        )
    }

    $coverUrl = ""
    if ($article.Cover) {
        if ($uploadedByPath.ContainsKey($article.Cover.FullName)) {
            $coverUrl = $uploadedByPath[$article.Cover.FullName]
        } elseif (
            $existing -and
            $existing.cover_image -and
            $existingImageUrls -notcontains $existing.cover_image
        ) {
            $coverUrl = $existing.cover_image
        } else {
            $coverUrl = Send-Image -Path $article.Cover.FullName -Token $token
        }
    }

    $body = @{
        title       = $article.Title
        summary     = $article.Summary
        content     = $rewrittenContent
        cover_image = $coverUrl
        category_id = [System.UInt32]$category.id
        status      = $Status
    }

    if ($existing) {
        Invoke-ApiJson -Method PUT -Path "/api/posts/$($existing.id)" -Token $token -Body $body | Out-Null
        Write-Host "Updated: $($article.Title)" -ForegroundColor Green
        $updated++
    } else {
        Invoke-ApiJson -Method POST -Path "/api/posts" -Token $token -Body $body | Out-Null
        Write-Host "Created: $($article.Title)" -ForegroundColor Green
        $created++
    }
}

Write-Host ""
Write-Host "Import complete: created=$created updated=$updated skipped=$skipped status=$Status" -ForegroundColor Green
