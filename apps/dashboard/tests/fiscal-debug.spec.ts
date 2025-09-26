import { test, expect } from '@playwright/test'

test.describe('Debug - Fiscais Page', () => {
  test('should load fiscais page and debug modal data', async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:3004')
    
    // Wait for page to load
    await page.waitForLoadState('networkidle')
    
    // Take a screenshot to see current state
    await page.screenshot({ path: 'debug-home.png' })
    
    // Try to find and click on fiscais navigation (assuming there's a nav menu)
    const fiscaisLink = page.locator('text=Fiscais').first()
    if (await fiscaisLink.isVisible()) {
      await fiscaisLink.click()
      await page.waitForLoadState('networkidle')
    } else {
      // Try to navigate directly to fiscais page
      await page.goto('http://localhost:3004/fiscais')
      await page.waitForLoadState('networkidle')
    }
    
    // Take screenshot of fiscais page
    await page.screenshot({ path: 'debug-fiscais.png' })
    
    // Check if we can see the "Novo fiscal" button
    const novoFiscalBtn = page.getByTestId('btn-novo-fiscal')
    await expect(novoFiscalBtn).toBeVisible()
    
    // Click on "Novo fiscal" button to open modal
    await novoFiscalBtn.click()
    
    // Wait for modal to appear
    await page.waitForSelector('[data-testid="fiscal-form-dialog"]')
    
    // Take screenshot of modal
    await page.screenshot({ path: 'debug-modal.png' })
    
    // Check if contatos select is present and has options
    const contatoSelect = page.getByTestId('select-fiscal-contato')
    await expect(contatoSelect).toBeVisible()
    
    // Get all options in contato select
    const contatoOptions = await contatoSelect.locator('option').allTextContents()
    console.log('Contato options:', contatoOptions)
    
    // Check if obras select is present and has options  
    const obraSelect = page.getByTestId('select-fiscal-obra')
    await expect(obraSelect).toBeVisible()
    
    // Get all options in obra select
    const obraOptions = await obraSelect.locator('option').allTextContents()
    console.log('Obra options:', obraOptions)
    
    // Listen to console logs from the browser
    page.on('console', msg => {
      if (msg.type() === 'log' || msg.type() === 'error') {
        console.log(`Browser ${msg.type()}: ${msg.text()}`)
      }
    })
    
    // Check if there are any network errors
    page.on('response', response => {
      if (!response.ok()) {
        console.log(`Network error: ${response.status()} ${response.url()}`)
      }
    })
  })
})