import * as XLSX from 'xlsx';
import { formatDate } from './format';

export function generateShiftExcel(shift, pricePerCubicMeter) {
    const totalSurtidores = shift.surtidores.reduce((sum, s) => {
        const vendido = (parseFloat(s.lecturaFinal) || 0) - (parseFloat(s.lecturaInicial) || 0)
        return sum + (vendido * pricePerCubicMeter)
    }, 0)

    const totalProductos = shift.ventas.reduce((sum, v) => sum + v.total, 0)
    const totalGeneral = totalSurtidores + totalProductos

    // Preparamos los datos para Excel
    const data = [
        ['INFORME DE CIERRE DE TURNO'],
        [''],
        ['Fecha', formatDate(shift.fecha)],
        ['Turno', shift.tipo.toUpperCase()],
        ['Encargado', shift.encargado],
        [''],
        ['SURTIDORES'],
        ['Surtidor', 'Lectura Inicial', 'Lectura Final', 'Metros Vendidos', 'Total ($)'],
    ];

    shift.surtidores.forEach((s, i) => {
        const vendido = (parseFloat(s.lecturaFinal) || 0) - (parseFloat(s.lecturaInicial) || 0);
        const totalSurtidor = vendido * pricePerCubicMeter;
        data.push([
            `Surtidor ${i + 1}`,
            s.lecturaInicial || 0,
            s.lecturaFinal || 0,
            vendido.toFixed(2),
            totalSurtidor.toFixed(2)
        ]);
    });

    data.push(['Total Surtidores', '', '', '', totalSurtidores.toFixed(2)]);
    data.push(['']);
    data.push(['PRODUCTOS VENDIDOS']);
    data.push(['Producto', 'Cantidad', 'Precio Unitario', 'Total']);

    shift.ventas.forEach(v => {
        data.push([
            v.nombre,
            v.cantidad,
            v.precio.toFixed(2),
            v.total.toFixed(2)
        ]);
    });

    data.push(['Total Productos', '', '', totalProductos.toFixed(2)]);
    data.push(['']);

    if (shift.depositos && shift.depositos.length > 0) {
        data.push(['CONTROL DE SOBRES']);
        data.push(['N° de Sobre', 'Hora', 'Monto', 'Nota']);
        shift.depositos.forEach(d => {
            data.push([d.numeroSobre, d.hora, d.monto.toFixed(2), d.nota || '']);
        });
        const totalSobres = shift.depositos.reduce((sum, d) => sum + d.monto, 0);
        data.push(['Suma Total Sobres', '', totalSobres.toFixed(2)]);
        data.push(['']);
    }

    const sumSobres = shift.depositos ? shift.depositos.reduce((sum, d) => sum + d.monto, 0) : 0;
    const diferencia = sumSobres - totalGeneral;

    data.push(['CONCILIACIÓN FINAL']);
    data.push(['(A) Total Ventas (Surtidores + Productos)', '', '', totalGeneral.toFixed(2)]);
    data.push(['(B) Total en Sobres', '', '', sumSobres.toFixed(2)]);
    data.push(['DIFERENCIA (B - A)', '', '', diferencia.toFixed(2)]);
    data.push(['ESTADO DE ARQUEO', '', '', diferencia === 0 ? 'CUADRADO' : (diferencia > 0 ? 'SOBRANTE' : 'FALTANTE')]);

    // Crear libro y hoja de trabajo
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Turno');

    // Descargar el archivo
    const formattedDateForFile = formatDate(shift.fecha).replace(/\//g, '-');
    XLSX.writeFile(wb, `cierre_turno_${formattedDateForFile}_${shift.tipo}.xlsx`);
}
