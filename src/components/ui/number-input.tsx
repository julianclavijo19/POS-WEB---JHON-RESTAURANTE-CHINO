'use client'

import React, { useState, useCallback } from 'react'
import { Minus, Plus } from 'lucide-react'

interface NumberInputProps {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  className?: string
  placeholder?: string
  label?: string
  showButtons?: boolean
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
}

export function NumberInput({
  value,
  onChange,
  min = 0,
  max = 999999,
  step = 1,
  className = '',
  placeholder = '0',
  label,
  showButtons = true,
  size = 'md',
  disabled = false
}: NumberInputProps) {
  const [inputValue, setInputValue] = useState(value.toString())

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    
    // Permitir campo vacío para poder escribir
    if (val === '') {
      setInputValue('')
      return
    }
    
    // Solo permitir números y punto decimal
    if (!/^-?\d*\.?\d*$/.test(val)) return
    
    setInputValue(val)
    
    const numValue = parseFloat(val)
    if (!isNaN(numValue)) {
      const clampedValue = Math.min(max, Math.max(min, numValue))
      onChange(clampedValue)
    }
  }, [min, max, onChange])

  const handleBlur = useCallback(() => {
    // Al perder el foco, asegurar un valor válido
    const numValue = parseFloat(inputValue) || min
    const clampedValue = Math.min(max, Math.max(min, numValue))
    setInputValue(clampedValue.toString())
    onChange(clampedValue)
  }, [inputValue, min, max, onChange])

  const handleIncrement = useCallback(() => {
    const newValue = Math.min(max, value + step)
    setInputValue(newValue.toString())
    onChange(newValue)
  }, [value, max, step, onChange])

  const handleDecrement = useCallback(() => {
    const newValue = Math.max(min, value - step)
    setInputValue(newValue.toString())
    onChange(newValue)
  }, [value, min, step, onChange])

  // Sincronizar cuando el valor externo cambie
  React.useEffect(() => {
    if (document.activeElement?.getAttribute('data-number-input') !== 'true') {
      setInputValue(value.toString())
    }
  }, [value])

  const sizeClasses = {
    sm: 'h-8 text-sm',
    md: 'h-10 text-base',
    lg: 'h-12 text-lg'
  }

  const buttonSizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12'
  }

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      <div className="flex items-center gap-1">
        {showButtons && (
          <button
            type="button"
            onClick={handleDecrement}
            disabled={disabled || value <= min}
            className={`${buttonSizeClasses[size]} flex items-center justify-center border border-gray-300 rounded-lg bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
          >
            <Minus className="h-4 w-4" />
          </button>
        )}
        <input
          type="text"
          inputMode="decimal"
          data-number-input="true"
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          className={`${sizeClasses[size]} w-full px-3 text-center border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed`}
        />
        {showButtons && (
          <button
            type="button"
            onClick={handleIncrement}
            disabled={disabled || value >= max}
            className={`${buttonSizeClasses[size]} flex items-center justify-center border border-gray-300 rounded-lg bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
          >
            <Plus className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  )
}
