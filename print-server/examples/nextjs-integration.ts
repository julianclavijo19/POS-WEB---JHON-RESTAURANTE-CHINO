/**
 * ============================================
 * EJEMPLO DE INTEGRACIÓN CON NEXT.JS
 * ============================================
 * 
 * Este archivo contiene ejemplos de cómo llamar
 * al servidor de impresión desde tu aplicación Next.js.
 * 
 * NOTA: Copia el código que necesites a tu proyecto,
 * este archivo es solo de referencia.
 */

// ============================================
// CONFIGURACIÓN
// ============================================

// URL del servidor de impresión (ajustar según tu configuración)
const PRINT_SERVER_URL = 'http://localhost:3001';

// Si el servidor está en otro PC de la red:
// const PRINT_SERVER_URL = 'http://192.168.1.100:3001';


// ============================================
// OPCIÓN 1: FUNCIÓN HELPER (Recomendado)
// ============================================

/**
 * Clase helper para manejar impresión de cocina
 * Añade este archivo a tu carpeta lib/ del proyecto Next.js
 * 
 * Uso:
 *   import { KitchenPrinter } from '@/lib/kitchen-printer';
 *   await KitchenPrinter.printOrder(orderData);
 */

export class KitchenPrinter {
  private static baseUrl = PRINT_SERVER_URL;

  /**
   * Verifica si el servidor de impresión está disponible
   */
  static async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(3000) // 3 segundos timeout
      });
      const data = await response.json();
      return data.status === 'ok';
    } catch {
      return false;
    }
  }

  /**
   * Verifica si la impresora está conectada
   */
  static async isPrinterConnected(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/printer-status`);
      const data = await response.json();
      return data.connected === true;
    } catch {
      return false;
    }
  }

  /**
   * Imprime una comanda de cocina
   */
  static async printOrder(order: {
    mesa: string;
    mesero: string;
    items: Array<{ nombre: string; cantidad: number; notas?: string }>;
    total?: number;
    hora?: string;
  }): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/print-kitchen`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...order,
          hora: order.hora || new Date().toLocaleTimeString('es-CO')
        }),
      });

      const result = await response.json();
      return {
        success: result.success,
        message: result.message || result.error
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Error de conexión con el servidor de impresión'
      };
    }
  }

  /**
   * Imprime múltiples comandas
   */
  static async printMultipleOrders(orders: Array<{
    mesa: string;
    mesero: string;
    items: Array<{ nombre: string; cantidad: number; notas?: string }>;
    total?: number;
    hora?: string;
  }>): Promise<{ success: boolean; results: any[] }> {
    try {
      const response = await fetch(`${this.baseUrl}/print-kitchen-batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ orders }),
      });

      return await response.json();
    } catch (error) {
      return {
        success: false,
        results: []
      };
    }
  }

  /**
   * Imprime un ticket de prueba
   */
  static async printTest(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/print-test`, {
        method: 'POST'
      });
      const result = await response.json();
      return result.success;
    } catch {
      return false;
    }
  }
}


// ============================================
// OPCIÓN 2: COMPONENTE REACT CON HOOK
// ============================================

import { useState, useCallback } from 'react';

/**
 * Hook personalizado para manejar impresión
 * 
 * Uso en componente:
 *   const { printOrder, isLoading, error } = useKitchenPrinter();
 *   await printOrder(orderData);
 */
export function useKitchenPrinter() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<any>(null);

  const printOrder = useCallback(async (order: {
    mesa: string;
    mesero: string;
    items: Array<{ nombre: string; cantidad: number; notas?: string }>;
    total?: number;
    hora?: string;
  }) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await KitchenPrinter.printOrder(order);
      setLastResult(result);
      
      if (!result.success) {
        setError(result.message);
      }
      
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setError(message);
      return { success: false, message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const printTest = useCallback(async () => {
    setIsLoading(true);
    const success = await KitchenPrinter.printTest();
    setIsLoading(false);
    return success;
  }, []);

  return {
    printOrder,
    printTest,
    isLoading,
    error,
    lastResult,
    clearError: () => setError(null)
  };
}


// ============================================
// OPCIÓN 3: SERVER ACTION (Next.js 13+)
// ============================================

// Archivo: app/actions/print-kitchen.ts
'use server';

export async function printKitchenOrder(order: {
  mesa: string;
  mesero: string;
  items: Array<{ nombre: string; cantidad: number; notas?: string }>;
  total?: number;
}) {
  try {
    const response = await fetch(`${PRINT_SERVER_URL}/print-kitchen`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...order,
        hora: new Date().toLocaleTimeString('es-CO')
      }),
      // No cachear
      cache: 'no-store'
    });

    const result = await response.json();
    
    return {
      success: result.success,
      message: result.success ? 'Comanda enviada a cocina' : result.message
    };
  } catch (error) {
    console.error('Error enviando a cocina:', error);
    return {
      success: false,
      message: 'No se pudo conectar con la impresora de cocina'
    };
  }
}


// ============================================
// OPCIÓN 4: API ROUTE (Next.js)
// ============================================

// Archivo: app/api/print-kitchen/route.ts

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const orderData = await request.json();

    // Validar datos
    if (!orderData.mesa || !orderData.items) {
      return NextResponse.json(
        { success: false, error: 'Datos incompletos' },
        { status: 400 }
      );
    }

    // Enviar al servidor de impresión
    const printResponse = await fetch(`${PRINT_SERVER_URL}/print-kitchen`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...orderData,
        hora: orderData.hora || new Date().toLocaleTimeString('es-CO')
      }),
    });

    const result = await printResponse.json();

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error en API de impresión:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error interno del servidor',
        message: 'No se pudo conectar con el servidor de impresión'
      },
      { status: 500 }
    );
  }
}


// ============================================
// EJEMPLO DE USO EN COMPONENTE
// ============================================

/**
 * Ejemplo de componente que usa el hook de impresión
 * 
 * Archivo: components/OrderForm.tsx
 */

/*
'use client';

import { useState } from 'react';
import { useKitchenPrinter } from '@/lib/kitchen-printer';

export function OrderForm() {
  const { printOrder, isLoading, error } = useKitchenPrinter();
  const [success, setSuccess] = useState(false);

  const handleSubmitOrder = async () => {
    setSuccess(false);
    
    const orderData = {
      mesa: "5",
      mesero: "Juan",
      items: [
        { nombre: "Hamburguesa", cantidad: 2, notas: "Sin cebolla" },
        { nombre: "Coca Cola", cantidad: 1, notas: "" }
      ],
      total: 25000
    };

    const result = await printOrder(orderData);
    
    if (result.success) {
      setSuccess(true);
      // Limpiar formulario, navegar, etc.
    }
  };

  return (
    <div>
      <button 
        onClick={handleSubmitOrder}
        disabled={isLoading}
      >
        {isLoading ? 'Enviando a cocina...' : 'Enviar a Cocina'}
      </button>
      
      {error && (
        <div className="text-red-500">
          Error: {error}
        </div>
      )}
      
      {success && (
        <div className="text-green-500">
          ¡Comanda enviada correctamente!
        </div>
      )}
    </div>
  );
}
*/


// ============================================
// EJEMPLO INTEGRACIÓN CON EL SISTEMA EXISTENTE
// ============================================

/**
 * Si ya tienes un sistema de comandas, puedes agregar
 * la impresión al flujo existente de esta manera:
 */

/*
// En tu endpoint de crear orden (app/api/orders/route.ts):

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const orderData = await request.json();
    
    // 1. Guardar la orden en la base de datos
    const order = await prisma.order.create({
      data: {
        tableId: orderData.tableId,
        waiterId: orderData.waiterId,
        items: {
          create: orderData.items.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            notes: item.notes
          }))
        }
      },
      include: {
        table: true,
        waiter: true,
        items: {
          include: {
            product: true
          }
        }
      }
    });

    // 2. Imprimir en cocina (en background, no bloquear respuesta)
    printToKitchen(order).catch(err => {
      console.error('Error imprimiendo en cocina:', err);
      // Aquí podrías guardar en una cola de reintento
    });

    // 3. Responder inmediatamente
    return NextResponse.json({ success: true, order });
    
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Error creando orden' }, { status: 500 });
  }
}

// Función auxiliar para imprimir
async function printToKitchen(order: any) {
  const printData = {
    mesa: order.table.number.toString(),
    mesero: order.waiter.name,
    items: order.items.map(item => ({
      nombre: item.product.name,
      cantidad: item.quantity,
      notas: item.notes || ''
    })),
    total: order.items.reduce((sum, item) => sum + (item.product.price * item.quantity), 0),
    hora: new Date().toLocaleTimeString('es-CO')
  };

  await fetch('http://localhost:3001/print-kitchen', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(printData)
  });
}
*/
