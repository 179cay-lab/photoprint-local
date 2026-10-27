; ============================================================
; NSIS Custom Hook for PhotoPrint Local
; Overrides default CHECK_APP_RUNNING to forcefully kill any
; running instances and prevent "cannot be closed" popups.
; ============================================================

!macro customCheckAppRunning
  nsExec::Exec 'taskkill /F /T /IM "${APP_EXECUTABLE_FILENAME}"'
  nsExec::Exec 'taskkill /F /T /IM "PhotoPrint Local.exe"'
  Sleep 1000
!macroend

!macro preInit
  nsExec::Exec 'taskkill /F /T /IM "${APP_EXECUTABLE_FILENAME}"'
  nsExec::Exec 'taskkill /F /T /IM "PhotoPrint Local.exe"'
  Sleep 500
!macroend

!macro customInit
  nsExec::Exec 'taskkill /F /T /IM "${APP_EXECUTABLE_FILENAME}"'
  nsExec::Exec 'taskkill /F /T /IM "PhotoPrint Local.exe"'
  Sleep 500
!macroend

!macro customUnInstall
  nsExec::Exec 'taskkill /F /T /IM "${APP_EXECUTABLE_FILENAME}"'
  nsExec::Exec 'taskkill /F /T /IM "PhotoPrint Local.exe"'
  Sleep 500
!macroend
