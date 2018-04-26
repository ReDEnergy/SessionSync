set EXEC_DIR=%~dp0
set SOURCE_DIR=%~dp0
cd %~dp0

:: Date date/time
SET ZIP="%SOURCE_DIR%\bin\7za.exe"
SET ARCHIVE="Session Sync.zip"

:: Export as archive
DEL %ARCHIVE%
%ZIP% a -tzip -bt -mx1 %ARCHIVE% ^
	.\data ^
	.\scripts ^
	.\_locales ^
	.\manifest.json ^
	.\README.md
