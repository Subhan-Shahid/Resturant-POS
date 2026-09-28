const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('burgerPos', {
  getMachineId: () => ipcRenderer.invoke('license:machineId'),
  activate: (key) => ipcRenderer.invoke('license:activate', key),
  printSilent: (htmlContent) => ipcRenderer.invoke('print:silent', htmlContent),
  printSilentToPrinter: (htmlContent, printerName) => ipcRenderer.invoke('print:silentToPrinter', htmlContent, printerName),
  printSilentToPrinterDefault: (htmlContent, printerName) => ipcRenderer.invoke('print:silentToPrinterDefault', htmlContent, printerName),
  printWithDialog: (htmlContent) => ipcRenderer.invoke('print:withDialog', htmlContent),
  getPrinterList: () => ipcRenderer.invoke('printer:getList'),
  clearPrintQueue: (printerName) => ipcRenderer.invoke('printer:clearQueue', printerName),
})
