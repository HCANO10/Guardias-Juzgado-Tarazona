import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  DSCard,
  DSBadge,
  DSButton,
  DSPageHeader,
  DSSectionHeading,
  DSEmptyState,
  DSSkeleton,
  DSCardSkeleton,
  DSStatusDot,
  DSAlert,
  getPositionBadgeVariant,
  tokens,
} from '../design-system'
import { Search } from 'lucide-react'

// ─────────────────────────────────────────────
// tokens
// ─────────────────────────────────────────────
describe('tokens', () => {
  it('tiene colores primarios definidos', () => {
    expect(tokens.colors.primary).toBe('#4F46E5')
    expect(tokens.colors.violet).toBe('#7C3AED')
  })

  it('tiene fuentes definidas', () => {
    expect(tokens.fonts.heading).toContain('Space Grotesk')
    expect(tokens.fonts.body).toContain('Inter')
  })
})

// ─────────────────────────────────────────────
// DSCard
// ─────────────────────────────────────────────
describe('DSCard', () => {
  it('renderiza children', () => {
    render(<DSCard>Contenido test</DSCard>)
    expect(screen.getByText('Contenido test')).toBeInTheDocument()
  })

  it('aplica className adicional', () => {
    const { container } = render(<DSCard className="extra-class">X</DSCard>)
    expect(container.firstChild).toHaveClass('extra-class')
  })

  it('aplica hover por defecto', () => {
    const { container } = render(<DSCard>X</DSCard>)
    expect(container.firstChild).toHaveClass('hover:shadow-md')
  })

  it('desactiva hover cuando hover=false', () => {
    const { container } = render(<DSCard hover={false}>X</DSCard>)
    expect(container.firstChild).not.toHaveClass('hover:shadow-md')
  })
})

// ─────────────────────────────────────────────
// DSBadge
// ─────────────────────────────────────────────
describe('DSBadge', () => {
  it('renderiza con variante por defecto (neutral)', () => {
    render(<DSBadge>Test</DSBadge>)
    const badge = screen.getByText('Test')
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveClass('bg-gray-100')
  })

  it('aplica variante green', () => {
    render(<DSBadge variant="green">Activo</DSBadge>)
    expect(screen.getByText('Activo')).toHaveClass('bg-emerald-50')
  })

  it('aplica variante auxilio', () => {
    render(<DSBadge variant="auxilio">Auxilio</DSBadge>)
    expect(screen.getByText('Auxilio')).toHaveClass('bg-amber-50')
  })
})

// ─────────────────────────────────────────────
// DSButton
// ─────────────────────────────────────────────
describe('DSButton', () => {
  it('renderiza children', () => {
    render(<DSButton>Click me</DSButton>)
    expect(screen.getByText('Click me')).toBeInTheDocument()
  })

  it('llama a onClick al hacer click', async () => {
    const user = userEvent.setup()
    let clicked = false
    render(<DSButton onClick={() => { clicked = true }}>Btn</DSButton>)
    await user.click(screen.getByText('Btn'))
    expect(clicked).toBe(true)
  })

  it('está deshabilitado cuando disabled=true', () => {
    render(<DSButton disabled>Disabled</DSButton>)
    expect(screen.getByText('Disabled').closest('button')).toBeDisabled()
  })

  it('aplica variante secondary', () => {
    render(<DSButton variant="secondary">Sec</DSButton>)
    const btn = screen.getByText('Sec').closest('button')!
    expect(btn).toHaveClass('bg-white')
  })

  it('aplica size sm', () => {
    render(<DSButton size="sm">Small</DSButton>)
    const btn = screen.getByText('Small').closest('button')!
    expect(btn).toHaveClass('text-xs')
  })
})

// ─────────────────────────────────────────────
// DSPageHeader
// ─────────────────────────────────────────────
describe('DSPageHeader', () => {
  it('renderiza título', () => {
    render(<DSPageHeader title="Mi Página" />)
    expect(screen.getByText('Mi Página')).toBeInTheDocument()
  })

  it('renderiza subtítulo cuando se proporciona', () => {
    render(<DSPageHeader title="Título" subtitle="Subtítulo" />)
    expect(screen.getByText('Subtítulo')).toBeInTheDocument()
  })

  it('renderiza acciones cuando se proporcionan', () => {
    render(<DSPageHeader title="T" actions={<button>Action</button>} />)
    expect(screen.getByText('Action')).toBeInTheDocument()
  })
})

// ─────────────────────────────────────────────
// DSSectionHeading
// ─────────────────────────────────────────────
describe('DSSectionHeading', () => {
  it('renderiza children', () => {
    render(<DSSectionHeading>Sección</DSSectionHeading>)
    expect(screen.getByText('Sección')).toBeInTheDocument()
  })
})

// ─────────────────────────────────────────────
// DSEmptyState
// ─────────────────────────────────────────────
describe('DSEmptyState', () => {
  it('renderiza título y descripción', () => {
    render(
      <DSEmptyState icon={Search} title="Sin datos" description="No hay datos aún" />
    )
    expect(screen.getByText('Sin datos')).toBeInTheDocument()
    expect(screen.getByText('No hay datos aún')).toBeInTheDocument()
  })

  it('renderiza acción opcional', () => {
    render(
      <DSEmptyState
        icon={Search}
        title="Vacío"
        description="Desc"
        action={<button>Crear</button>}
      />
    )
    expect(screen.getByText('Crear')).toBeInTheDocument()
  })
})

// ─────────────────────────────────────────────
// DSStatusDot
// ─────────────────────────────────────────────
describe('DSStatusDot', () => {
  it('renderiza label cuando se proporciona', () => {
    render(<DSStatusDot status="success" label="Activo" />)
    expect(screen.getByText('Activo')).toBeInTheDocument()
  })

  it('no renderiza texto de label cuando no se proporciona', () => {
    const { container } = render(<DSStatusDot status="danger" />)
    // Solo debe haber 1 span hijo (el dot), no un segundo span con texto
    const innerSpans = container.querySelectorAll('span > span')
    expect(innerSpans).toHaveLength(1) // solo el dot
  })
})

// ─────────────────────────────────────────────
// DSAlert
// ─────────────────────────────────────────────
describe('DSAlert', () => {
  it('renderiza con título y contenido', () => {
    render(<DSAlert variant="warning" title="Atención">Mensaje</DSAlert>)
    expect(screen.getByText('Atención')).toBeInTheDocument()
    expect(screen.getByText('Mensaje')).toBeInTheDocument()
  })

  it('aplica estilos de variante danger', () => {
    const { container } = render(<DSAlert variant="danger">Error</DSAlert>)
    expect(container.firstChild).toHaveClass('bg-red-50')
  })
})

// ─────────────────────────────────────────────
// getPositionBadgeVariant
// ─────────────────────────────────────────────
describe('getPositionBadgeVariant', () => {
  it('devuelve auxilio para posiciones de auxilio', () => {
    expect(getPositionBadgeVariant('Auxilio Judicial')).toBe('auxilio')
  })

  it('devuelve tramitador para tramitador', () => {
    expect(getPositionBadgeVariant('Tramitador Procesal')).toBe('tramitador')
  })

  it('devuelve gestor para gestor', () => {
    expect(getPositionBadgeVariant('Gestor Procesal')).toBe('gestor')
  })

  it('devuelve purple para juez', () => {
    expect(getPositionBadgeVariant('Juez')).toBe('purple')
  })

  it('devuelve indigo para letrado', () => {
    expect(getPositionBadgeVariant('Letrado de la Administración')).toBe('indigo')
  })

  it('devuelve indigo para LAJ', () => {
    expect(getPositionBadgeVariant('LAJ')).toBe('indigo')
  })

  it('devuelve red para médico forense', () => {
    expect(getPositionBadgeVariant('Médico Forense')).toBe('red')
  })

  it('devuelve neutral para posición desconocida', () => {
    expect(getPositionBadgeVariant('Otro cargo')).toBe('neutral')
  })

  it('devuelve neutral para string vacío', () => {
    expect(getPositionBadgeVariant('')).toBe('neutral')
  })
})
