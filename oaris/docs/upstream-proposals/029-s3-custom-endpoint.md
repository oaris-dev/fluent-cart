# Upstream Proposal: S3-Compatible Custom Endpoint Support

> **Consumer plugin:** independent of any single consumer — benefits anyone using FluentCart's S3 driver with a non-AWS provider.
> **Priority:** Medium
> **FluentCart Version:** 1.3.10
> **Status:** Draft — ready for public fork PR

> ⚠ **Not re-audited against 1.3.15.** This doc still describes FluentCart 1.3.10 and hasn't been verified against the current `upstream/master` (1.3.15). The S3 driver and its operation classes may have been refactored since. Re-audit — and stamp the version header up-to-date — before opening a PR. See [`025-product-editor-custom-fields.md`](025-product-editor-custom-fields.md) for the pattern.

## Problem Statement

FluentCart's S3 storage driver hardcodes `amazonaws.com` as the endpoint in **all 5 operation
classes**. This means the S3 driver only works with AWS S3 — it cannot be used with any
S3-compatible storage provider:

- **Hetzner Object Storage** — `fsn1.your-objectstorage.com` (popular in EU/Germany)
- **DigitalOcean Spaces** — `{region}.digitaloceanspaces.com`
- **Backblaze B2** — `s3.{region}.backblazeb2.com`
- **MinIO** — self-hosted, any custom domain
- **Cloudflare R2** — `{account-id}.r2.cloudflarestorage.com`
- **Wasabi** — `s3.{region}.wasabisys.com`

This is especially relevant for European users who need GDPR-compliant storage within the EU.
Hetzner's data centers are in Germany (Falkenstein, Nuremberg) and Finland (Helsinki), making
them ideal for German online shops.

## Current Architecture — Hardcoded AWS Endpoints

### S3FileUploader.php (lines 42-52)
```php
$hasDot = strpos($this->bucket, '.') !== false;
if ($hasDot) {
    $this->requestUrl = "https://s3.{$this->region}.amazonaws.com/{$this->bucket}/{$this->s3FilePath}";
} else {
    $this->requestUrl = "https://{$this->bucket}.s3.{$this->region}.amazonaws.com/{$this->s3FilePath}";
}
```

### S3FileList.php (lines 42-60)
```php
if ($this->bucket === '') {
    $baseUrl = "https://s3.{$this->region}.amazonaws.com";
} elseif ($hasDot) {
    $baseUrl = "https://s3.{$this->region}.amazonaws.com/{$this->bucket}";
} else {
    $baseUrl = "https://{$this->bucket}.s3.{$this->region}.amazonaws.com";
}
```

### S3BucketList.php (line 34)
```php
$this->requestUrl = "https://s3.amazonaws.com";
```

### S3FileDeleter.php (line 32)
```php
$this->requestUrl = "https://{$this->bucket}.s3.amazonaws.com/{$this->s3FilePath}";
```

### S3ConnectionVerify.php (line 34)
```php
$this->requestUrl = "https://s3.amazonaws.com/?list-type=2&encoding-type=url&max-keys=1";
```

### S3Driver.php (lines 14-18) — No endpoint property
```php
class S3Driver extends BaseDriver
{
    private string $accessKey;
    private string $secretKey;
    private string $bucket;
    private string $region;
    // No $endpoint property
```

### S3Settings.php (lines 40-48) — No endpoint setting
```php
public static function getDefaults()
{
    return [
        'is_active'  => 'no',
        'secret_key' => '',
        'access_key' => '',
        'bucket'     => '',
        'region'     => 'us-east-1',
        // No 'endpoint' key
    ];
}
```

## Proposed Changes

### 1. Add `endpoint` to S3Settings

**File:** `app/Modules/StorageDrivers/S3/S3Settings.php`

```php
public static function getDefaults()
{
    return [
        'is_active'  => 'no',
        'secret_key' => '',
        'access_key' => '',
        'bucket'     => '',
        'region'     => 'us-east-1',
        'endpoint'   => '',  // NEW: empty = AWS, custom = S3-compatible
    ];
}
```

### 2. Add `endpoint` property to S3Driver

**File:** `app/Services/FileSystem/Drivers/S3/S3Driver.php`

```php
class S3Driver extends BaseDriver
{
    private string $accessKey;
    private string $secretKey;
    private string $bucket;
    private string $region;
    private string $endpoint;  // NEW

    public function __construct(array $config)
    {
        $this->accessKey = $config['access_key'] ?? '';
        $this->secretKey = $config['secret_key'] ?? '';
        $this->bucket    = $config['bucket'] ?? '';
        $this->region    = $config['region'] ?? 'us-east-1';
        $this->endpoint  = $config['endpoint'] ?? '';  // NEW
    }
```

### 3. Add endpoint-aware URL builder

Create a shared method (or trait) used by all 5 operation classes:

```php
/**
 * Build the S3 endpoint URL.
 *
 * If a custom endpoint is configured, use path-style URLs (required by most
 * S3-compatible providers). Otherwise, use AWS virtual-hosted style.
 *
 * @param string $bucket     Bucket name (empty for global operations)
 * @param string $region     AWS region or provider region
 * @param string $endpoint   Custom endpoint (empty for AWS)
 * @param string $path       Object key path (optional)
 * @return string
 */
protected function buildEndpointUrl(
    string $bucket,
    string $region,
    string $endpoint,
    string $path = ''
): string {
    // Custom endpoint (Hetzner, DigitalOcean, MinIO, etc.)
    if (!empty($endpoint)) {
        $endpoint = rtrim($endpoint, '/');
        // Always use path-style for custom endpoints
        if (empty($bucket)) {
            return $endpoint;
        }
        return $endpoint . '/' . $bucket . ($path ? '/' . $path : '');
    }

    // AWS S3 (existing behavior)
    $hasDot = strpos($bucket, '.') !== false;

    if (empty($bucket)) {
        return "https://s3.{$region}.amazonaws.com";
    }

    if ($hasDot) {
        // Path-style for dotted bucket names
        return "https://s3.{$region}.amazonaws.com/{$bucket}" . ($path ? '/' . $path : '');
    }

    // Virtual-hosted style
    return "https://{$bucket}.s3.{$region}.amazonaws.com" . ($path ? '/' . $path : '');
}
```

### 4. Update all 5 operation classes

**S3FileUploader.php** (lines 42-52):
```php
// Before:
// $this->requestUrl = "https://{$this->bucket}.s3.{$this->region}.amazonaws.com/{$this->s3FilePath}";

// After:
$this->requestUrl = $this->buildEndpointUrl(
    $this->bucket, $this->region, $this->endpoint, $this->s3FilePath
);
```

**S3FileList.php** (lines 42-60):
```php
$baseUrl = $this->buildEndpointUrl($this->bucket, $this->region, $this->endpoint);
$this->requestUrl = "{$baseUrl}/?encoding-type=url&list-type=2&max-keys={$this->maxKeys}";
```

**S3BucketList.php** (line 34):
```php
$this->requestUrl = $this->buildEndpointUrl('', $this->region, $this->endpoint);
```

**S3FileDeleter.php** (line 32):
```php
$this->requestUrl = $this->buildEndpointUrl(
    $this->bucket, $this->region, $this->endpoint, $this->s3FilePath
);
```

**S3ConnectionVerify.php** (line 34):
```php
$baseUrl = $this->buildEndpointUrl('', $this->region, $this->endpoint);
$this->requestUrl = "{$baseUrl}/?list-type=2&encoding-type=url&max-keys=1";
```

### 5. Update S3 settings UI

**File:** S3 settings Vue component

Add an "Endpoint" field below the Region field:

```vue
<el-form-item label="Custom Endpoint (optional)">
  <el-input
    v-model="settings.endpoint"
    placeholder="Leave empty for AWS S3"
  />
  <div class="fc-field-help">
    For S3-compatible providers (Hetzner, DigitalOcean Spaces, MinIO, etc.).
    Example: https://fsn1.your-objectstorage.com
  </div>
</el-form-item>
```

### 6. Signing adjustments for custom endpoints

S3-compatible providers use the same AWS Signature V4 signing process. The key differences:

- **Host header** must match the custom endpoint's host
- **Region** may still be required (some providers use `us-east-1` as default)
- **Service** stays `s3`

Verify that the existing signing code in the base S3 class uses `$this->requestUrl` to derive
the Host header (it likely does). If the Host is hardcoded to `amazonaws.com`, it needs to be
derived from the URL.

## Backward Compatibility

- `endpoint` defaults to `''` — existing AWS configurations work unchanged
- When `endpoint` is empty, URL construction is identical to current behavior
- No migration needed — new setting is optional
- S3 signing works the same way for all S3-compatible providers

## Example Configurations

### AWS S3 (current, unchanged)
```php
[
    'access_key' => 'AKIA...',
    'secret_key' => '...',
    'bucket'     => 'my-bucket',
    'region'     => 'eu-central-1',
    'endpoint'   => '',  // empty = AWS
]
```

### Hetzner Object Storage
```php
[
    'access_key' => 'HETZNER_KEY',
    'secret_key' => 'HETZNER_SECRET',
    'bucket'     => 'my-shop-files',
    'region'     => 'fsn1',
    'endpoint'   => 'https://fsn1.your-objectstorage.com',
]
```

### DigitalOcean Spaces
```php
[
    'access_key' => 'DO_KEY',
    'secret_key' => 'DO_SECRET',
    'bucket'     => 'my-space',
    'region'     => 'fra1',
    'endpoint'   => 'https://fra1.digitaloceanspaces.com',
]
```

### MinIO (self-hosted)
```php
[
    'access_key' => 'minioadmin',
    'secret_key' => 'minioadmin',
    'bucket'     => 'uploads',
    'region'     => 'us-east-1',
    'endpoint'   => 'https://minio.example.com',
]
```

## Testing

1. **AWS (regression):** Existing S3 config with empty endpoint → works exactly as before
2. **Hetzner:** Configure with Hetzner credentials → upload, list, delete all work
3. **DigitalOcean Spaces:** Configure → test full lifecycle
4. **Connection verify:** Custom endpoint → connection test passes
5. **Bucket listing:** Custom endpoint → buckets listed correctly
6. **Dotted bucket names:** Custom endpoint + dotted bucket → path-style URL used
7. **UI:** Endpoint field shows in settings, placeholder text guides users
8. **Signing:** Verify Host header matches custom endpoint, not amazonaws.com

## Files Changed

| File | Change |
|------|--------|
| `app/Modules/StorageDrivers/S3/S3Settings.php` | Add `endpoint` default |
| `app/Services/FileSystem/Drivers/S3/S3Driver.php` | Add `$endpoint` property |
| `app/Services/FileSystem/Drivers/S3/S3FileUploader.php` | Use `buildEndpointUrl()` |
| `app/Services/FileSystem/Drivers/S3/S3FileList.php` | Use `buildEndpointUrl()` |
| `app/Services/FileSystem/Drivers/S3/S3BucketList.php` | Use `buildEndpointUrl()` |
| `app/Services/FileSystem/Drivers/S3/S3FileDeleter.php` | Use `buildEndpointUrl()` |
| `app/Services/FileSystem/Drivers/S3/S3ConnectionVerify.php` | Use `buildEndpointUrl()` |
| S3 base class or trait | New `buildEndpointUrl()` method |
| S3 settings Vue component | Add endpoint input field |

## Community Impact

This change benefits a large portion of the WordPress community:
- European users who need GDPR-compliant storage in EU data centers
- Self-hosted users running MinIO
- Users who prefer cost-effective alternatives (Backblaze B2, Wasabi)
- Enterprise users with private cloud S3-compatible storage

Many WordPress plugins already support custom S3 endpoints (WP Offload Media, UpdraftPlus,
BackWPup). Adding this to FluentCart aligns with ecosystem expectations.
