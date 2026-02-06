import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' } })
  }

  try {
    const { shift, totals, recipient } = await req.json()

    const formatDate = (dateStr: string) => {
      const [y, m, d] = dateStr.split('-')
      return `${d}/${m}/${y}`
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'Senda Verde <onboarding@resend.dev>',
        to: [recipient],
        subject: `Cierre de Turno - ${shift.tipo.toUpperCase()} - ${formatDate(shift.fecha)}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
            <h2 style="color: #166534; border-bottom: 2px solid #166534; padding-bottom: 10px;">Resumen de Cierre de Turno</h2>
            <p><strong>Fecha:</strong> ${formatDate(shift.fecha)}</p>
            <p><strong>Turno:</strong> ${shift.tipo.toUpperCase()}</p>
            <p><strong>Encargado:</strong> ${shift.encargado}</p>
            
            <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin-top: 20px;">
              <h3 style="margin-top: 0; color: #1e40af;">Conciliación Final</h3>
              <table style="width: 100%;">
                <tr>
                  <td>Total Ventas (A):</td>
                  <td style="text-align: right; font-weight: bold;">$${totals.total.toFixed(2)}</td>
                </tr>
                <tr>
                  <td>Total en Sobres (B):</td>
                  <td style="text-align: right; font-weight: bold;">$${totals.depositos.toFixed(2)}</td>
                </tr>
                <tr style="border-top: 1px solid #ccc;">
                  <td style="padding-top: 10px; font-weight: bold;">Diferencia (B-A):</td>
                  <td style="padding-top: 10px; text-align: right; font-weight: bold; color: ${totals.estaCuadrado ? '#166534' : '#991b1b'};">
                    $${totals.diferencia.toFixed(2)}
                  </td>
                </tr>
              </table>
              <p style="text-align: center; margin-top: 15px;">
                <span style="background-color: ${totals.estaCuadrado ? '#166534' : '#991b1b'}; color: white; padding: 5px 15px; border-radius: 20px; font-size: 14px; font-weight: bold; text-transform: uppercase;">
                  ${totals.estaCuadrado ? 'CUADRADO' : 'PENDIENTE'}
                </span>
              </p>
            </div>
            
            <p style="font-size: 12px; color: #64748b; margin-top: 30px; text-align: center;">
              Este es un reporte automático generado por el Sistema Senda Verde GNC.
            </p>
          </div>
        `,
      }),
    })

    const data = await res.json()
    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      status: 500,
    })
  }
})
