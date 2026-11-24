// Frontend tests for the ItemForm page — THIS is the only frontend file you edit.
// Run with:  npm test --workspace client
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import ItemForm from './ItemForm.jsx'
import { api } from '../api'

// Replace the real axios instance with fake (mock) functions — no server needed.
// In a test you decide what each one returns, e.g.
//   api.post.mockResolvedValue({ data: { item: {} } })                                  // success
//   api.post.mockRejectedValue({ response: { status: 409, data: { message: '...' } } }) // failure
// and afterwards check how it was called:
//   expect(api.post).toHaveBeenCalledWith('/items', { ... })
jest.mock('../api', () => ({
  api: { get: jest.fn(), post: jest.fn(), patch: jest.fn() }
}))

// Helper: renders ItemForm at `path`. "/items/new" = report mode, "/items/<id>" = edit mode.
// After a successful save the page navigates to /items, which renders the text "Items page".
function renderAt(path) {
  return render(
    <MemoryRouter initialEntries={[path]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/items/new" element={<ItemForm />} />
        <Route path="/items/:id" element={<ItemForm />} />
        <Route path="/items" element={<div>Items page</div>} />
      </Routes>
    </MemoryRouter>
  )
}

// Reset every mock's calls and return values before each test.
beforeEach(() => jest.clearAllMocks())

describe('ItemForm — report mode (/items/new)', () => {
  // Worked example — read it, then write the two tests below in the same style.
  test('renders all fields with their default values', () => {
    renderAt('/items/new')
    expect(screen.getByRole('heading', { name: /report item/i })).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/title/i)).toHaveValue('')
    const [status, category] = screen.getAllByRole('combobox') // the two <select>s
    expect(status).toHaveValue('lost')
    expect(category).toHaveValue('other')
  })

  test('submitting POSTs { title, status, category, location, description } (no reportedBy) and navigates to /items', async () => {
    // Arrange: the fake API will answer "saved!" and the form is on screen
    api.post.mockResolvedValue({ data: { item: {} } })
    renderAt('/items/new')

    // Act: fill in every field like a user would, then click Save
    await userEvent.type(screen.getByPlaceholderText(/title/i), 'Black backpack')
    const [status, category] = screen.getAllByRole('combobox')
    await userEvent.selectOptions(status, 'found')
    await userEvent.selectOptions(category, 'accessories')
    await userEvent.type(screen.getByPlaceholderText(/location/i), 'Library')
    await userEvent.type(screen.getByPlaceholderText(/description/i), 'Has a red keychain')
    await userEvent.click(screen.getByRole('button', { name: /save/i }))

    // Assert: exactly these five fields were sent (toHaveBeenCalledWith compares
    // the whole object, so an extra reportedBy would make it fail)...
    expect(api.post).toHaveBeenCalledWith('/items', {
      title: 'Black backpack',
      status: 'found',
      category: 'accessories',
      location: 'Library',
      description: 'Has a red keychain'
    })
    // ...and the page moved on to /items
    expect(await screen.findByText('Items page')).toBeInTheDocument()
  })
  test('shows the server\'s message when the request fails (e.g. 409) and stays on the page', async () => {
    // Arrange: the fake API will answer with an error, like the real server does for a duplicate
    api.post.mockRejectedValue({ response: { data: { message: 'Duplicate item at this location' } } })
    renderAt('/items/new')

    // Act: fill in a title and click Save
    await userEvent.type(screen.getByPlaceholderText(/title/i), 'Black backpack')
    await userEvent.click(screen.getByRole('button', { name: /save/i }))

    // Assert: the server's message is shown...
    expect(await screen.findByText('Duplicate item at this location')).toBeInTheDocument()
    // ...and we did NOT go to /items (queryBy returns null instead of throwing)
    expect(screen.queryByText('Items page')).not.toBeInTheDocument()
  })
})
