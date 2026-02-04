@echo off
REM Run all Supabase migrations via SQL Editor
REM Usage: run-migrations.bat <SUPABASE_URL> <SERVICE_ROLE_KEY>

setlocal enabledelayedexpansion

if "%~1"=="" (
    echo Error: Missing SUPABASE_URL parameter
    echo Usage: run-migrations.bat ^<SUPABASE_URL^> ^<SERVICE_ROLE_KEY^>
    exit /b 1
)

if "%~2"=="" (
    echo Error: Missing SERVICE_ROLE_KEY parameter
    echo Usage: run-migrations.bat ^<SUPABASE_URL^> ^<SERVICE_ROLE_KEY^>
    exit /b 1
)

set SUPABASE_URL=%~1
set SERVICE_KEY=%~2

echo Starting migrations...
echo.

for %%f in (supabase\migrations\*.sql) do (
    echo Running: %%~nxf
    
    REM Read file content (this is simplified - may need adjustment for large files)
    set /p SQL_CONTENT=<"%%f"
    
    REM Use curl to execute via Supabase REST API
    curl -X POST "%SUPABASE_URL%/rest/v1/rpc/exec_sql" ^
         -H "apikey: %SERVICE_KEY%" ^
         -H "Authorization: Bearer %SERVICE_KEY%" ^
         -H "Content-Type: application/json" ^
         -d "{\"query\": \"!SQL_CONTENT!\"}"
    
    echo.
)

echo.
echo All migrations completed!
