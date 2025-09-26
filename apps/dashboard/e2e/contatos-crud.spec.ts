import { expect, test } from '@playwright/test'

const LOGIN_WHATSAPP = process.env.PLAYWRIGHT_LOGIN_WHATSAPP ?? '11943681101'
const LOGIN_PASSWORD = process.env.PLAYWRIGHT_LOGIN_PASSWORD ?? 'senha123'

function generateUniqueDigits(): string {
  const now = Date.now().toString()
  return now.slice(-8)
}

function buildWhatsappDigits(): string {
  const unique = generateUniqueDigits()
  return `119${unique}`
}

test.describe('Contatos CRUD', () => {
  test('criar, editar e remover contato real via dashboard', async ({ page }) => {
    const contactBaseDigits = buildWhatsappDigits()
    const contactName = `Contato Playwright ${contactBaseDigits}`
    const updatedName = `${contactName} Atualizado`

    await page.goto('/login')

    await page.getByTestId('input-login-whatsapp').fill(LOGIN_WHATSAPP)
    await page.getByTestId('input-login-senha').fill(LOGIN_PASSWORD)
    await page.getByTestId('btn-login-submit').click()

    await page.getByTestId('nav-contatos').waitFor()
    await page.getByTestId('nav-contatos').click()

    await expect(page.getByTestId('page-heading-contatos')).toBeVisible()

    await page.getByTestId('btn-novo-contato').click()

    await page.getByTestId('input-contato-nome').fill(contactName)
    await page.getByTestId('input-contato-whatsapp').fill(contactBaseDigits)
    await page.getByTestId('select-contato-tipo').selectOption('fiscal')
    await page.getByTestId('btn-salvar-contato').click()

    const feedback = page.getByTestId('contatos-feedback-success')
    await expect(feedback).toContainText('Contato criado com sucesso.')

    const createdRow = page.locator('tbody tr').filter({ hasText: contactName })
    await expect(createdRow).toBeVisible()
    await expect(createdRow).toContainText('Fiscal')
    await expect(createdRow).toContainText(contactName)

    await createdRow.getByRole('button', { name: 'Editar' }).click()

    await expect(page.getByText('Editar contato')).toBeVisible()

    await page.getByTestId('input-contato-nome').fill(updatedName)
    await page.getByTestId('select-contato-tipo').selectOption('fornecedor')
    await page.getByTestId('btn-salvar-contato').click()

    await expect(feedback).toContainText('Contato atualizado com sucesso.')

    const updatedRow = page.locator('tbody tr').filter({ hasText: updatedName })
    await expect(updatedRow).toBeVisible()
    await expect(updatedRow).toContainText('Fornecedor')

    await updatedRow.getByRole('button', { name: 'Remover' }).click()

    await expect(page.getByTestId('confirm-dialog')).toBeVisible()
    await page.getByTestId('btn-dialog-confirm').click()

    await expect(feedback).toContainText('Contato removido com sucesso.')
    await expect(page.locator('tbody tr').filter({ hasText: updatedName })).toHaveCount(0)
  })
})


