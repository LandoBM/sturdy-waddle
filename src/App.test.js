import { render, screen } from '@testing-library/react'
import App from './App'

test('renders the app intro copy', () => {
  render(<App />)

  expect(screen.getByText(/outside is better/i)).toBeInTheDocument()
  expect(screen.getByText(/^together\.$/i)).toBeInTheDocument()
})
