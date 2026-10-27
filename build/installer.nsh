; ============================================================
; NSIS Custom Hook for PhotoPrint Local
; Automatically terminates any running instances to prevent
; "PhotoPrint Local cannot be closed" and file-locking errors
; ============================================================

!macro preInit
  Exec 'taskkill /im "PhotoPrint Local.exe" /f'
  Sleep 500
!macroend

!macro customInit
  Exec 'taskkill /im "PhotoPrint Local.exe" /f'
  Sleep 500
!macroend

!macro customUnInstall
  Exec 'taskkill /im "PhotoPrint Local.exe" /f'
  Sleep 500
!macroend
