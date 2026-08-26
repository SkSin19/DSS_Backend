@echo off
REM Wrapper so you can run: RemoveProductsOf --brand "JBL Professional"
REM Forwards all arguments to the Python script in this same folder.
setlocal
where python >nul 2>nul && (
  python "%~dp0RemoveProductsOf.py" %*
) || (
  py "%~dp0RemoveProductsOf.py" %*
)
endlocal
