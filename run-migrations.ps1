# Run All Supabase Migrations
# Usage: .\run-migrations.ps1 -DatabaseUrl "postgresql://postgres:[PASSWORD]@[HOST]:[PORT]/postgres"

param(
    [Parameter(Mandatory=$true)]
    [string]$DatabaseUrl
)

Write-Host "Starting migration process..." -ForegroundColor Green

# Get all migration files sorted by timestamp
$migrationFiles = Get-ChildItem -Path ".\supabase\migrations\*.sql" | Sort-Object Name

Write-Host "Found $($migrationFiles.Count) migration files" -ForegroundColor Cyan

foreach ($file in $migrationFiles) {
    Write-Host "`nRunning migration: $($file.Name)" -ForegroundColor Yellow
    
    # Read file content
    $sqlContent = Get-Content -Path $file.FullName -Raw
    
    # Execute using psql (requires PostgreSQL client installed)
    # Or use Invoke-RestMethod to call Supabase REST API
    
    try {
        # Using psql command (requires PostgreSQL client)
        $sqlContent | psql $DatabaseUrl
        Write-Host "✓ Successfully executed: $($file.Name)" -ForegroundColor Green
    }
    catch {
        Write-Host "✗ Failed to execute: $($file.Name)" -ForegroundColor Red
        Write-Host "Error: $_" -ForegroundColor Red
        exit 1
    }
}

Write-Host "`n✓ All migrations completed successfully!" -ForegroundColor Green
