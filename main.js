// Sanitize and harden print HTML for better compatibility with thermal drivers
function preparePrintHtml(htmlContent){
  try {
    let html = String(htmlContent || '')
    
    // Remove external font links that can cause issues
    html = html.replace(/<link[^>]*fonts\.googleapis[^>]*>/gi, '')
    
    // Check if @page rules already exist
    const hasPage = /@page\s*\{[^}]*\}/i.test(html)
    
    // Enhanced CSS for thermal printer compatibility
    const pageCss = '@page { size: 80mm auto; margin: 0; }'
    const baseCss = `
      html, body { 
        color: #000 !important; 
        background: #fff !important;
        font-family: Arial, sans-serif !important;
        font-weight: 700 !important;
        margin: 0 !important;
        padding: 0 !important;
      }
      * { 
        -webkit-print-color-adjust: exact !important; 
        print-color-adjust: exact !important;
        box-sizing: border-box !important;
      }
      @media print { 
        body { width: 68mm !important; }
        * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      }
    `
    
    const inject = `<style>${baseCss}${hasPage ? '' : pageCss}</style>`
    
    // Inject styles properly
    if (html.includes('</head>')) {
      html = html.replace('</head>', `${inject}</head>`)
    } else if (html.includes('<head>')) {
      html = html.replace('<head>', `<head>${inject}`)
    } else {
      html = `<!DOCTYPE html><html><head><meta charset="utf-8">${inject}</head><body>${html}</body></html>`
    }
    
    return html
  } catch (error) {
    console.error('Error preparing HTML:', error)
    return htmlContent
  }
}

import { app, BrowserWindow, ipcMain, shell, Menu } from 'electron'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'
import os from 'os'
import { ensureActivated, verifyAndSaveActivation, getMachineId } from './license.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

let mainWindow
try { app.setName('Resturant POS') } catch {}

function loadView(view) {
  if (!mainWindow) return
  
  const isDev = process.env.NODE_ENV === 'development'
  const devServerUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173'
  
  if (view === 'dashboard') {
    if (isDev) {
      // In development, load from Vite dev server
      mainWindow.loadURL(devServerUrl)
    } else {
      // In production, load from dist folder
      const distPath = path.join(__dirname, 'dist', 'index.html')
      const url = new URL(`file://${distPath.replace(/\\/g,'/')}`)
      mainWindow.loadURL(url.toString())
    }
  } else {
    const basePath = path.join(__dirname, 'renderer', 'index.html')
    const url = new URL(`file://${basePath.replace(/\\/g,'/')}`)
    url.hash = 'activate'
    mainWindow.loadURL(url.toString())
  }
}

function createWindow(view) {
  mainWindow = new BrowserWindow({
    width: 980,
    height: 640,
    resizable: true,
    title: 'Resturant POS',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  try { mainWindow.on('page-title-updated', (e) => e.preventDefault()) } catch {}

  loadView(view)

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  // Start maximized
  try { mainWindow.maximize() } catch {}

  // App menu with Fullscreen toggle and helpful items
  const template = [
    {
      label: 'File',
      submenu: [
        { role: 'quit' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forcereload' },
        { type: 'separator' },
        {
          label: 'Toggle Full Screen',
          accelerator: 'F11',
          click: () => {
            try { mainWindow.setFullScreen(!mainWindow.isFullScreen()) } catch {}
          },
        },
        { type: 'separator' },
        { role: 'toggleDevTools' },
      ],
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'close' },
      ],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Open Data Folder',
          click: () => {
            try { shell.openPath(app.getPath('userData')) } catch {}
          },
        },
      ],
    },
  ]
  try { Menu.setApplicationMenu(Menu.buildFromTemplate(template)) } catch {}
}

function getUserDataPath() {
  return app.getPath('userData')
}

app.whenReady().then(async () => {
  // Check activation status
  const userData = getUserDataPath()
  const activationFile = path.join(userData, 'activation.json')

  const machineId = await getMachineId()

  let view = 'activate'
  try {
    const data = fs.existsSync(activationFile) ? JSON.parse(fs.readFileSync(activationFile, 'utf-8')) : null
    if (data?.licenseKey && (await ensureActivated(data.licenseKey, machineId))) {
      view = 'dashboard'
    }
  } catch {}

  createWindow(view)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow(view)
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
// IPC handlers
ipcMain.handle('license:machineId', async () => {
  return await getMachineId()
})

ipcMain.handle('license:activate', async (_evt, licenseKey) => {
  const machineId = await getMachineId()
  const ok = await verifyAndSaveActivation(licenseKey, machineId)
  if (ok) {
    // Load the main React app after activation
    loadView('dashboard')
  }
  return ok
})

// Silent print handler
ipcMain.handle('print:silent', async (_evt, htmlContent) => {
  try {
    if (!mainWindow) return { success: false, error: 'No window available' }
    
    // Create a hidden BrowserWindow for printing with optimized settings
    const printWindow = new BrowserWindow({
      width: 600, // Increased width to accommodate larger receipts
      height: 1200,
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        zoomFactor: 2,
        backgroundThrottling: false,
      },
    })

    // Load the sanitized HTML content
    const finalHtml = preparePrintHtml(htmlContent)
    await printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(finalHtml)}`)

    try { await printWindow.webContents.executeJavaScript(`(async()=>{try{await Promise.race([document.fonts?.ready||Promise.resolve(), new Promise(r=>setTimeout(r,800))]);}catch(e){} return true;})()`) } catch {}
    try { await printWindow.webContents.executeJavaScript(`(async()=>{try{if(document.readyState!=='complete'){await new Promise(r=>window.addEventListener('load',()=>r(),{once:true}))} const imgs=[...document.images||[]]; await Promise.race([Promise.allSettled(imgs.map(img=>img.complete?Promise.resolve():new Promise(res=>{img.addEventListener('load',res,{once:true});img.addEventListener('error',res,{once:true});setTimeout(res,600);}))), new Promise(r=>setTimeout(r,600))]); await new Promise(r=>setTimeout(r,120));}catch(e){} return true;})()`)} catch {}
    try { await new Promise(r=>setTimeout(r,80)) } catch {}

    // Rasterize page to image for maximum driver compatibility, then print it
    try {
      const metrics = await printWindow.webContents.executeJavaScript(`(function(){ try{ const el=document.documentElement; const b=document.body||el; const w=Math.max(el.scrollWidth, b.scrollWidth, el.clientWidth); const h=Math.max(el.scrollHeight, b.scrollHeight, el.clientHeight); return { w: Math.ceil(w||600), h: Math.ceil(h||1200) }; }catch(e){ return { w:600, h:1200 }; } })()`)
      try { printWindow.setContentSize(Math.min(Math.max(600, metrics.w), 1200), Math.min(Math.max(800, metrics.h + 40), 5000)) } catch {}
      const img = await printWindow.webContents.capturePage({ x: 0, y: 0, width: Math.min(Math.max(600, metrics.w), 2000), height: Math.min(Math.max(800, metrics.h), 8000) })
      const dataUrl = img && typeof img.toDataURL === 'function' ? img.toDataURL() : ''
      if (dataUrl) {
        const rasterHtml = `<!DOCTYPE html><html><head><meta charset="utf-8" />
        <style>@page{size:80mm auto;margin:0} html,body{margin:0;padding:0;background:#fff} img{width:68mm;display:block;margin:0 auto;image-rendering:pixelated;}</style>
        </head><body><img id="rimg" src="${dataUrl}" alt="receipt" /><div style="height:28mm"></div></body></html>`
        await printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(rasterHtml)}`)
        try {
          await printWindow.webContents.executeJavaScript(`(async()=>{const im=document.getElementById('rimg'); if(!im) return true; if(im.complete) {await new Promise(r=>setTimeout(r,50)); return true;} await new Promise(r=>{im.addEventListener('load',()=>r(),{once:true}); im.addEventListener('error',()=>r(),{once:true}); setTimeout(r,2000)}); await new Promise(r=>setTimeout(r,50)); return true;})()`)
        } catch {}
      }
    } catch {}
    return new Promise((resolve) => {
      printWindow.webContents.print(
        {
          silent: true,
          printBackground: true,
          margins: { marginType: 'none' },
          pageSize: { width: 80000, height: 500000 },
          copies: 1,
          collate: false,
          color: false,
        },
        (success, errorType) => {
          try { printWindow.close() } catch {}
          if (success) resolve({ success: true })
          else resolve({ success: false, errorType: errorType || 'Print failed' })
        }
      )
    })
  } catch (error) {
    return { success: false, error: error.message }
  }
})

// Silent print to specific printer - Robust version with rasterization and data URL support
ipcMain.handle('print:silentToPrinter', async (_evt, htmlContent, printerName) => {
  let printWindow = null
  try {
    if (!mainWindow) return { success: false, error: 'No window available' }
    if (!htmlContent || !printerName) {
      return { success: false, error: 'Missing HTML content or printer name' }
    }
    
    console.log(`Starting print job to: ${printerName}`)
    
    // Create a hidden BrowserWindow for printing
    printWindow = new BrowserWindow({
      width: 600,
      height: 1200,
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        zoomFactor: 2,
        backgroundThrottling: false,
      },
    })

    // Load content: support data URL input or raw HTML
    const isDataUrl = typeof htmlContent === 'string' && /^data:text\/html/i.test(htmlContent)
    const finalUrl = isDataUrl
      ? String(htmlContent)
      : `data:text/html;charset=utf-8,${encodeURIComponent(preparePrintHtml(htmlContent))}`

    console.log('Loading HTML for printing (silentToPrinter)...')
    await printWindow.loadURL(finalUrl)

    // Wait for DOM ready, fonts and images with short timeouts
    console.log('Waiting for content to load...')
    await Promise.race([
      printWindow.webContents.executeJavaScript(`
        new Promise((resolve) => {
          if (document.readyState === 'complete') {
            setTimeout(resolve, 100)
          } else {
            window.addEventListener('load', () => setTimeout(resolve, 100), { once: true })
          }
        })
      `),
      new Promise(resolve => setTimeout(resolve, 2000))
    ])
    try { await printWindow.webContents.executeJavaScript(`(async()=>{try{await Promise.race([document.fonts?.ready||Promise.resolve(), new Promise(r=>setTimeout(r,800))]);}catch(e){} return true;})()`) } catch {}
    try { await printWindow.webContents.executeJavaScript(`(async()=>{try{const imgs=[...document.images||[]]; await Promise.race([Promise.allSettled(imgs.map(img=>img.complete?Promise.resolve():new Promise(res=>{img.addEventListener('load',res,{once:true});img.addEventListener('error',res,{once:true});setTimeout(res,600);}))), new Promise(r=>setTimeout(r,600))]); await new Promise(r=>setTimeout(r,100));}catch(e){} return true;})()`) } catch {}

    // Rasterize for maximum driver compatibility, then print the raster image
    try {
      const metrics = await printWindow.webContents.executeJavaScript(`(function(){ try{ const el=document.documentElement; const b=document.body||el; const w=Math.max(el.scrollWidth, b.scrollWidth, el.clientWidth); const h=Math.max(el.scrollHeight, b.scrollHeight, el.clientHeight); return { w: Math.ceil(w||600), h: Math.ceil(h||1200) }; }catch(e){ return { w:600, h:1200 }; } })()`)
      try { printWindow.setContentSize(Math.min(Math.max(600, metrics.w), 1200), Math.min(Math.max(800, metrics.h + 40), 5000)) } catch {}
      const img = await printWindow.webContents.capturePage({ x: 0, y: 0, width: Math.min(Math.max(600, metrics.w), 2000), height: Math.min(Math.max(800, metrics.h), 8000) })
      const dataUrl = img && typeof img.toDataURL === 'function' ? img.toDataURL() : ''
      if (dataUrl) {
        const rasterHtml = `<!DOCTYPE html><html><head><meta charset="utf-8" />
        <style>@page{size:80mm auto;margin:0} html,body{margin:0;padding:0;background:#fff} img{width:68mm;display:block;margin:0 auto;image-rendering:pixelated;}</style>
        </head><body><img id="rimg" src="${dataUrl}" alt="receipt" /><div style="height:28mm"></div></body></html>`
        await printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(rasterHtml)}`)
        try {
          await printWindow.webContents.executeJavaScript(`(async()=>{const im=document.getElementById('rimg'); if(!im) return true; if(im.complete){await new Promise(r=>setTimeout(r,50)); return true;} await new Promise(r=>{im.addEventListener('load',()=>r(),{once:true}); im.addEventListener('error',()=>r(),{once:true}); setTimeout(r,2000)}); await new Promise(r=>setTimeout(r,50)); return true;})()`)
        } catch {}
      }
    } catch {}

    // Print with custom 80mm page size
    return new Promise((resolve) => {
      let resolved = false
      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true
          console.log('Print operation timed out')
          try { printWindow?.close() } catch {}
          resolve({ success: false, error: 'Print operation timed out after 10 seconds' })
        }
      }, 10000)

      printWindow.webContents.print(
        {
          silent: true,
          printBackground: true,
          deviceName: String(printerName),
          margins: { marginType: 'none' },
          pageSize: { width: 80000, height: 500000 },
          copies: 1,
          collate: false,
          color: false,
        },
        (success, errorType) => {
          if (!resolved) {
            resolved = true
            clearTimeout(timeout)
            try { printWindow?.close() } catch {}
            if (success) {
              console.log('Print job completed successfully')
              resolve({ success: true })
            } else {
              console.log('Print job failed:', errorType)
              resolve({ success: false, error: errorType || 'Print failed - check printer connection and paper' })
            }
          }
        }
      )
    })
  } catch (error) {
    console.error('Print error:', error)
    try { printWindow?.close() } catch {}
    return { success: false, error: error.message || 'Unknown print error' }
  }
})

// Silent print to DEFAULT system printer (no deviceName) with robust pipeline
ipcMain.handle('print:silentToPrinterDefault', async (_evt, htmlContent) => {
  let printWindow = null
  try {
    if (!mainWindow) return { success: false, error: 'No window available' }
    if (!htmlContent) return { success: false, error: 'Missing HTML content' }

    console.log('Starting print job to DEFAULT printer')

    printWindow = new BrowserWindow({
      width: 600,
      height: 1200,
      show: false,
      webPreferences: { nodeIntegration: false, contextIsolation: true, zoomFactor: 2, backgroundThrottling: false },
    })

    const isDataUrl = typeof htmlContent === 'string' && /^data:text\/html/i.test(htmlContent)
    const finalUrl = isDataUrl
      ? String(htmlContent)
      : `data:text/html;charset=utf-8,${encodeURIComponent(preparePrintHtml(htmlContent))}`

    console.log('Loading HTML for printing (silentToPrinterDefault)...')
    await printWindow.loadURL(finalUrl)

    // Wait for DOM + fonts + images with timeouts
    await Promise.race([
      printWindow.webContents.executeJavaScript(`
        new Promise((resolve) => {
          if (document.readyState === 'complete') { setTimeout(resolve, 100) } 
          else { window.addEventListener('load', () => setTimeout(resolve, 100), { once: true }) }
        })
      `),
      new Promise(resolve => setTimeout(resolve, 2000)),
    ])
    try { await printWindow.webContents.executeJavaScript(`(async()=>{try{await Promise.race([document.fonts?.ready||Promise.resolve(), new Promise(r=>setTimeout(r,800))]);}catch(e){} return true;})()`) } catch {}
    try { await printWindow.webContents.executeJavaScript(`(async()=>{try{const imgs=[...document.images||[]]; await Promise.race([Promise.allSettled(imgs.map(img=>img.complete?Promise.resolve():new Promise(res=>{img.addEventListener('load',res,{once:true});img.addEventListener('error',res,{once:true});setTimeout(res,600);}))), new Promise(r=>setTimeout(r,600))]); await new Promise(r=>setTimeout(r,100));}catch(e){} return true;})()`) } catch {}

    // Rasterize to image and print that
    try {
      const metrics = await printWindow.webContents.executeJavaScript(`(function(){ try{ const el=document.documentElement; const b=document.body||el; const w=Math.max(el.scrollWidth, b.scrollWidth, el.clientWidth); const h=Math.max(el.scrollHeight, b.scrollHeight, el.clientHeight); return { w: Math.ceil(w||600), h: Math.ceil(h||1200) }; }catch(e){ return { w:600, h:1200 }; } })()`)
      try { printWindow.setContentSize(Math.min(Math.max(600, metrics.w), 1200), Math.min(Math.max(800, metrics.h + 40), 5000)) } catch {}
      const img = await printWindow.webContents.capturePage({ x: 0, y: 0, width: Math.min(Math.max(600, metrics.w), 2000), height: Math.min(Math.max(800, metrics.h), 8000) })
      const dataUrl = img && typeof img.toDataURL === 'function' ? img.toDataURL() : ''
      if (dataUrl) {
        const rasterHtml = `<!DOCTYPE html><html><head><meta charset="utf-8" />
        <style>@page{size:80mm auto;margin:0} html,body{margin:0;padding:0;background:#fff} img{width:68mm;display:block;margin:0 auto;image-rendering:pixelated;image-rendering: crisp-edges;}</style>
        </head><body><img id="rimg" src="${dataUrl}" alt="receipt" /><div style="height:28mm"></div></body></html>`
        await printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(rasterHtml)}`)
        try {
          await printWindow.webContents.executeJavaScript(`(async()=>{const im=document.getElementById('rimg'); if(!im) return true; if(im.complete){await new Promise(r=>setTimeout(r,50)); return true;} await new Promise(r=>{im.addEventListener('load',()=>r(),{once:true}); im.addEventListener('error',()=>r(),{once:true}); setTimeout(r,2000)}); await new Promise(r=>setTimeout(r,50)); return true;})()`)
        } catch {}
      }
    } catch {}

    return new Promise((resolve) => {
      let resolved = false
      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true
          try { printWindow?.close() } catch {}
          resolve({ success: false, error: 'Print operation timed out after 10 seconds' })
        }
      }, 10000)

      printWindow.webContents.print(
        {
          silent: true,
          printBackground: true,
          margins: { marginType: 'none' },
          pageSize: { width: 80000, height: 500000 },
          copies: 1,
          collate: false,
          color: false,
        },
        (success, errorType) => {
          if (!resolved) {
            resolved = true
            clearTimeout(timeout)
            try { printWindow?.close() } catch {}
            if (success) resolve({ success: true })
            else resolve({ success: false, error: errorType || 'Print failed' })
          }
        }
      )
    })
  } catch (error) {
    console.error('Print default error:', error)
    try { printWindow?.close() } catch {}
    return { success: false, error: error.message || 'Unknown print error' }
  }
})

// Print with dialog - shows normal print dialog for user to select printer
ipcMain.handle('print:withDialog', async (_evt, htmlContent) => {
  let printWindow = null
  try {
    if (!mainWindow) return { success: false, error: 'No window available' }
    if (!htmlContent) {
      return { success: false, error: 'Missing HTML content' }
    }
    
    console.log('Opening print dialog...')
    
    // Create a hidden BrowserWindow for printing
    printWindow = new BrowserWindow({
      width: 300,
      height: 800,
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        backgroundThrottling: false,
      },
    })

    // Load the HTML content
    const finalHtml = preparePrintHtml(htmlContent)
    console.log('Loading HTML content for print dialog...')
    
    await printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(finalHtml)}`)

    // Wait for content to load
    await Promise.race([
      printWindow.webContents.executeJavaScript(`
        new Promise((resolve) => {
          if (document.readyState === 'complete') {
            setTimeout(resolve, 100)
          } else {
            window.addEventListener('load', () => setTimeout(resolve, 100), { once: true })
          }
        })
      `),
      new Promise(resolve => setTimeout(resolve, 2000))
    ])

    console.log('Content loaded, showing print dialog...')
    
    // Show print dialog (not silent)
    return new Promise((resolve) => {
      let resolved = false
      
      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true
          console.log('Print dialog timed out')
          try { printWindow?.close() } catch {}
          resolve({ success: false, error: 'Print dialog timed out' })
        }
      }, 30000) // 30 second timeout for user interaction
      
      printWindow.webContents.print(
        {
          silent: false, // Show print dialog
          printBackground: true,
          margins: { marginType: 'none' },
          pageSize: { width: 80000, height: 297000 },
          copies: 1,
          collate: false,
          color: false,
        },
        (success, errorType) => {
          if (!resolved) {
            resolved = true
            clearTimeout(timeout)
            
            try { printWindow?.close() } catch {}
            
            if (success) {
              console.log('Print dialog completed successfully')
              resolve({ success: true })
            } else {
              console.log('Print dialog cancelled or failed:', errorType)
              resolve({ 
                success: false, 
                error: errorType || 'Print cancelled or failed'
              })
            }
          }
        }
      )
    })
  } catch (error) {
    console.error('Print dialog error:', error)
    try { printWindow?.close() } catch {}
    return { success: false, error: error.message || 'Unknown print error' }
  }
})

// Get list of available printers
ipcMain.handle('printer:getList', async () => {
  try {
    // Create a temporary hidden window to access printer list
    const tempWindow = new BrowserWindow({
      width: 100,
      height: 100,
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
    })

    const printers = await tempWindow.webContents.getPrintersAsync()
    tempWindow.close()
    
    return {
      success: true,
      printers: printers.map(p => ({
        name: p.name,
        displayName: p.displayName || p.name,
        description: p.description || '',
        status: p.status || 0,
        isDefault: p.isDefault || false,
      }))
    }
  } catch (error) {
    return { success: false, error: error.message, printers: [] }
  }
})

// Clear printer queue (stub)
ipcMain.handle('printer:clearQueue', async (_evt, _printerName) => {
  try {
    return { success: false, error: 'Not implemented' }
  } catch (error) {
    return { success: false, error: error.message }
  }
})
