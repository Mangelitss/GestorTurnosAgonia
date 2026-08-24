// =============================================================
//  EXPORTACION A PDF
//  Genera un documento HTML con el diseno cofrade y lo manda a
//  la ventana de impresion del navegador (Guardar como PDF).
//  No necesita librerias externas.
// =============================================================

import { VARAS } from './constantes'
import { fechaBonita, MESES, rejillaMes, agruparPorFecha, DIAS_SEMANA } from './calendario'
import { mediaAltura } from './cuadrante'
import { tramosOrdenados } from './conflictos'

const CABECERA = `
  <div class="cab">
    <div class="cruz">✝</div>
    <div>
      <h1>TERCIO DEL CRISTO DE LA AGONÍA Y MARÍA MAGDALENA</h1>
      <p>M.I. Mayordomía de Ntro. Padre Jesús Nazareno · Orihuela</p>
    </div>
  </div>
`

const ESTILOS = `
  <style>
    @page { size: A4 landscape; margin: 12mm; }
    * { box-sizing: border-box; }
    body {
      font-family: Georgia, 'Times New Roman', serif;
      color: #1a1a1a; margin: 0; padding: 0;
      -webkit-print-color-adjust: exact; print-color-adjust: exact;
    }
    .cab {
      display: flex; align-items: center; gap: 14px;
      border-bottom: 3px solid #D1B514; padding-bottom: 10px; margin-bottom: 16px;
    }
    .cab .cruz { font-size: 30px; color: #4F1243; }
    .cab h1 { font-size: 14px; margin: 0; color: #4F1243; letter-spacing: 1px; }
    .cab p  { font-size: 10px; margin: 3px 0 0; color: #666; }

    .titulo { font-size: 19px; color: #4F1243; margin: 0 0 4px; }
    .subtitulo { font-size: 11px; color: #555; margin: 0 0 16px; }

    .turno { page-break-inside: avoid; margin-bottom: 22px; }
    .turno h2 {
      font-size: 13px; color: #fff; background: #4F1243;
      padding: 6px 12px; margin: 0 0 10px; letter-spacing: 2px;
      border-left: 4px solid #D1B514;
    }

    /* --- Etiquetas DELANTE / DETRAS --- */
    .etiqueta {
      display: flex; align-items: center; gap: 10px; margin: 6px 0;
    }
    .etiqueta span {
      font-size: 9px; font-weight: bold; color: #97820B;
      letter-spacing: 4px; text-transform: uppercase; white-space: nowrap;
    }
    .etiqueta i { flex: 1; height: 1px; background: #e2d9a8; display: block; }

    /* --- Barra del trono --- */
    .barra-trono {
      background: #4F1243; border-top: 2px solid #D1B514; border-bottom: 2px solid #D1B514;
      color: #D1B514; text-align: center; padding: 8px;
      font-size: 11px; font-weight: bold; letter-spacing: 8px;
      margin: 8px 0; border-radius: 3px;
    }

    /* --- Rejilla de varas --- */
    .rejilla { display: flex; gap: 8px; }
    .col { flex: 1; }
    .col h3 {
      font-size: 8px; margin: 0 0 4px; text-align: center;
      color: #4F1243; letter-spacing: 2px; text-transform: uppercase;
    }
    table.p { width: 100%; border-collapse: collapse; font-size: 8.5px; }
    table.p td {
      padding: 2.5px 4px; border: 1px solid #eee; background: #fff;
    }
    table.p td.n { width: 13px; color: #bbb; font-size: 7.5px; text-align: center; }
    table.p td.a { text-align: right; color: #777; width: 30px; white-space: nowrap; }
    tr.libre td { color: #ccc; font-style: italic; background: #fbfbfb; }
    tr.bloq td { background: #f6f1f5; }
    tr.bloq td.nom::before { content: '🔒 '; }
    .medias { display: flex; gap: 8px; margin-top: 4px; }
    .medias div { flex: 1; text-align: center; font-size: 7.5px; color: #999; }

    /* --- Bloques de la procesion --- */
    .bloque { margin-bottom: 20px; page-break-inside: avoid; }
    .seccion {
      font-size: 12px; color: #4F1243; margin: 0 0 8px;
      border-bottom: 2px solid #D1B514; padding-bottom: 4px;
      letter-spacing: 1px; text-transform: uppercase;
    }
    .turno h2.cruz { background: #075985; }
    .barra-cruz { background: #075985 !important; }
    .tramos-turno {
      float: right; font-size: 8px; font-weight: normal;
      opacity: .85; letter-spacing: 0; text-transform: none;
    }

    table.lista { width: 100%; border-collapse: collapse; font-size: 10px; }
    table.lista th {
      background: #4F1243; color: #fff; padding: 6px 8px; text-align: left;
      font-size: 9px; letter-spacing: 1px; text-transform: uppercase;
    }
    table.lista td { padding: 5px 8px; border-bottom: 1px solid #eee; }
    table.lista tr:nth-child(even) td { background: #faf8fa; }

    .pie {
      margin-top: 14px; padding-top: 8px; border-top: 1px solid #ddd;
      font-size: 8px; color: #999; display: flex; justify-content: space-between;
    }
    .nota {
      background: #fdfaf0; border-left: 3px solid #D1B514;
      padding: 8px 12px; font-size: 10px; margin-bottom: 14px;
    }

    /* --- Calendario --- */
    table.cal { width: 100%; border-collapse: collapse; table-layout: fixed; }
    table.cal th {
      background: #4F1243; color: #fff; padding: 6px; font-size: 10px;
      letter-spacing: 1px; text-transform: uppercase;
    }
    table.cal td {
      border: 1px solid #ddd; height: 78px; vertical-align: top;
      padding: 4px; font-size: 9px;
    }
    td.fuera { background: #fafafa; color: #ccc; }
    .dia { font-weight: bold; color: #4F1243; font-size: 10px; margin-bottom: 3px; }
    td.fuera .dia { color: #ccc; }
    .ev {
      background: #f4f0f3; border-left: 2px solid #D1B514;
      padding: 2px 4px; margin-bottom: 2px; font-size: 8px; line-height: 1.3;
    }
    .ev b { color: #4F1243; }
  </style>
`

// Abre la ventana de impresion con el documento montado
function imprimir(titulo, cuerpo, orientacion = 'landscape') {
  const html = `
    <!DOCTYPE html>
    <html lang="es">
      <head>
        <meta charset="utf-8">
        <title>${titulo}</title>
        ${ESTILOS}
        <style>@page { size: A4 ${orientacion}; margin: 12mm; }</style>
      </head>
      <body>
        ${CABECERA}
        ${cuerpo}
        <div class="pie">
          <span>Gestor Cofrade · Cristo de la Agonía</span>
          <span>Generado el ${new Date().toLocaleDateString('es-ES')}</span>
        </div>
      </body>
    </html>
  `

  const win = window.open('', '_blank')
  if (!win) {
    alert('El navegador ha bloqueado la ventana emergente.\n\nPermite las ventanas emergentes de esta página para poder exportar el PDF.')
    return false
  }
  win.document.write(html)
  win.document.close()
  win.focus()
  // Damos un instante a que se apliquen los estilos
  setTimeout(() => win.print(), 400)
  return true
}

function escapar(s) {
  return String(s ?? '').replace(/[&<>"]/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])
  )
}

// =============================================================
//  PDF DEL CUADRANTE
// =============================================================

export function pdfCuadrante(ensayo, cuadrante) {
  if (!cuadrante?.length) {
    alert('Este ensayo todavía no tiene un cuadrante generado.')
    return
  }

  // Pinta la mitad (Delante o Detras) de las tres varas en columnas
  const mitad = (turno, seccion, conTitulo) => `
    <div class="rejilla">
      ${VARAS.map((vara) => {
        const lista = turno.varas[vara]?.[seccion] || []
        const filas = lista.map((p, i) => {
          if (!p) {
            return `<tr class="libre"><td class="n">${i + 1}</td><td>Libre</td><td class="a">—</td></tr>`
          }
          return `<tr class="${p.bloqueado ? 'bloq' : ''}">
            <td class="n">${i + 1}</td>
            <td class="nom">${escapar(p.nombre)}</td>
            <td class="a">${p.altura || '—'}</td>
          </tr>`
        }).join('')

        return `<div class="col">
          ${conTitulo ? `<h3>${vara}</h3>` : ''}
          <table class="p">${filas}</table>
        </div>`
      }).join('')}
    </div>
  `

  const turnosHTML = cuadrante.map((turno) => {
    const medias = `
      <div class="medias">
        ${VARAS.map((vara) => {
          const todos = [
            ...(turno.varas[vara]?.Delante || []),
            ...(turno.varas[vara]?.Detras || []),
          ]
          const m = mediaAltura(todos)
          const ocup = todos.filter(Boolean).length
          return `<div>${ocup}/${todos.length} · media ${m > 0 ? `${m.toFixed(0)} cm` : '—'}</div>`
        }).join('')}
      </div>
    `

    return `
      <div class="turno">
        <h2>TURNO ${turno.id}</h2>
        <div class="etiqueta"><i></i><span>Delante</span><i></i></div>
        ${mitad(turno, 'Delante', true)}
        <div class="barra-trono">✝ &nbsp; T R O N O &nbsp; ✝</div>
        ${mitad(turno, 'Detras', false)}
        ${medias}
        <div class="etiqueta"><i></i><span>Detrás</span><i></i></div>
      </div>
    `
  }).join('')

  const cuerpo = `
    <h2 class="titulo">Cuadrante de Ensayo</h2>
    <p class="subtitulo">
      ${fechaBonita(ensayo.fecha_iso)} · ${escapar(ensayo.hora)} · ${escapar(ensayo.lugar)}
    </p>
    ${ensayo.notas ? `<div class="nota"><b>Indicaciones:</b> ${escapar(ensayo.notas)}</div>` : ''}
    ${turnosHTML}
  `

  imprimir(`Cuadrante ensayo ${fechaBonita(ensayo.fecha_iso)}`, cuerpo, 'landscape')
}

// =============================================================
//  PDF DE LA LISTA DE ASISTENTES
// =============================================================

export function pdfAsistentes(ensayo, asistentes) {
  if (!asistentes?.length) {
    alert('Este ensayo todavía no tiene asistentes apuntados.')
    return
  }

  const ordenados = [...asistentes].sort((a, b) =>
    a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' })
  )

  const filas = ordenados.map((a, i) => `
    <tr>
      <td style="width:30px;color:#999">${i + 1}</td>
      <td><b>${escapar(a.nombre)}</b></td>
      <td style="width:80px">${a.altura || '—'} cm</td>
      <td style="width:90px">${a.invitado ? 'Invitado' : 'Censo'}</td>
    </tr>
  `).join('')

  const cuerpo = `
    <h2 class="titulo">Lista de Asistencia</h2>
    <p class="subtitulo">
      ${fechaBonita(ensayo.fecha_iso)} · ${escapar(ensayo.hora)} · ${escapar(ensayo.lugar)}
      &nbsp;·&nbsp; <b>${ordenados.length} asistentes</b>
    </p>
    <table class="lista">
      <thead>
        <tr><th>#</th><th>Costalero</th><th>Altura</th><th>Origen</th></tr>
      </thead>
      <tbody>${filas}</tbody>
    </table>
  `

  imprimir(`Asistencia ensayo ${fechaBonita(ensayo.fecha_iso)}`, cuerpo, 'portrait')
}

// =============================================================
//  PDF DE UNA PROCESION
//  Cuadrante completo: trono, cruz y tramos.
// =============================================================

export function pdfProcesion(procesion) {
  const {
    nombre, tramos = [], cuadrante_trono, cuadrante_cruz,
    lleva_cruz, normativa,
  } = procesion || {}

  if (!cuadrante_trono && !cuadrante_cruz) {
    alert('Esta procesión todavía no tiene ningún cuadrante generado.')
    return
  }

  const orden = tramosOrdenados(tramos)

  // ---- Tabla de tramos ----
  const filasTramos = orden.map((t, i) => `
    <tr>
      <td style="width:26px;color:#999;text-align:center">${i + 1}</td>
      <td><b>${escapar(t.nombre || `Tramo ${i + 1}`)}</b></td>
      <td>${escapar(t.desde || '—')} → ${escapar(t.hasta || '—')}</td>
      <td style="width:70px;text-align:center">${t.fase === 'regreso' ? 'Regreso' : 'Ida'}</td>
      <td style="width:60px;text-align:center"><b>${escapar(t.turno_trono || '—')}</b></td>
      ${lleva_cruz ? `<td style="width:60px;text-align:center">${escapar(t.turno_cruz || '—')}</td>` : ''}
    </tr>
  `).join('')

  const tablaTramos = orden.length ? `
    <div class="bloque">
      <h3 class="seccion">Tramos del recorrido</h3>
      <table class="lista">
        <thead>
          <tr>
            <th>#</th><th>Tramo</th><th>Recorrido</th><th>Fase</th>
            <th>Trono</th>${lleva_cruz ? '<th>Cruz</th>' : ''}
          </tr>
        </thead>
        <tbody>${filasTramos}</tbody>
      </table>
    </div>
  ` : ''

  // ---- Cuadrantes ----
  const bloqueCuadrante = (cuadrante, titulo, esCruz) => {
    if (!cuadrante?.length) return ''
    const varas = Object.keys(cuadrante[0].varas || {})

    const mitad = (turno, seccion, conTitulo) => `
      <div class="rejilla">
        ${varas.map((vara) => {
          const lista = turno.varas[vara]?.[seccion] || []
          const filas = lista.map((p, i) => {
            if (!p) return `<tr class="libre"><td class="n">${i + 1}</td><td>Libre</td><td class="a">—</td></tr>`
            return `<tr class="${p.bloqueado ? 'bloq' : ''}">
              <td class="n">${i + 1}</td>
              <td class="nom">${escapar(p.nombre)}${p.repetidor ? ' (R)' : ''}</td>
              <td class="a">${p.altura || '—'}</td>
            </tr>`
          }).join('')
          return `<div class="col">${conTitulo ? `<h3>${vara}</h3>` : ''}<table class="p">${filas}</table></div>`
        }).join('')}
      </div>
    `

    const turnos = cuadrante.map((turno) => {
      const susTramos = orden.filter(
        (t) => String(esCruz ? t.turno_cruz : t.turno_trono) === String(turno.id)
      )
      const etiqueta = susTramos.length
        ? susTramos.map((t) => escapar(t.nombre)).join(' · ')
        : 'Sin tramo asignado'

      return `
        <div class="turno">
          <h2 class="${esCruz ? 'cruz' : ''}">
            TURNO ${turno.id}
            <span class="tramos-turno">${etiqueta}</span>
          </h2>
          <div class="etiqueta"><i></i><span>Delante</span><i></i></div>
          ${mitad(turno, 'Delante', true)}
          <div class="barra-trono ${esCruz ? 'barra-cruz' : ''}">
            ✝ &nbsp; ${esCruz ? 'C R U Z' : 'T R O N O'} &nbsp; ✝
          </div>
          ${mitad(turno, 'Detras', false)}
          <div class="etiqueta"><i></i><span>Detrás</span><i></i></div>
        </div>
      `
    }).join('')

    return `<div class="bloque"><h3 class="seccion">${titulo}</h3>${turnos}</div>`
  }

  // ---- Textos de los tramos ----
  const textos = orden.filter((t) => t.texto?.trim())
  const bloqueTextos = textos.length ? `
    <div class="bloque">
      <h3 class="seccion">Indicaciones por tramo</h3>
      ${textos.map((t) => `
        <div class="nota">
          <b>${escapar(t.nombre)}</b> — ${escapar(t.desde || '—')} → ${escapar(t.hasta || '—')}
          <div style="margin-top:4px">${escapar(t.texto)}</div>
        </div>
      `).join('')}
    </div>
  ` : ''

  const bloqueNormativa = normativa?.trim() ? `
    <div class="bloque">
      <h3 class="seccion">Normativa de la cuadrilla</h3>
      <div class="nota" style="white-space:pre-wrap">${escapar(normativa)}</div>
    </div>
  ` : ''

  const cuerpo = `
    <h2 class="titulo">${escapar(nombre || 'Procesión')}</h2>
    <p class="subtitulo">Cuadrante oficial de costaleros</p>
    ${tablaTramos}
    ${bloqueCuadrante(cuadrante_trono, 'Trono', false)}
    ${lleva_cruz ? bloqueCuadrante(cuadrante_cruz, 'Cruz Guía', true) : ''}
    ${bloqueTextos}
    ${bloqueNormativa}
  `

  imprimir(`Cuadrante ${nombre || 'procesion'}`, cuerpo, 'landscape')
}

// =============================================================
//  PDF DEL CALENDARIO (mes)
// =============================================================

export function pdfCalendarioMes(anio, mes, eventos) {
  const celdas = rejillaMes(anio, mes)
  const porFecha = agruparPorFecha(eventos)

  let filas = ''
  for (let s = 0; s < 6; s++) {
    const semana = celdas.slice(s * 7, s * 7 + 7)
    if (semana.every((c) => !c.delMes)) continue

    filas += '<tr>' + semana.map((c) => {
      const evs = (porFecha[c.iso] || []).map((e) => `
        <div class="ev"><b>${escapar(e.hora)}</b> ${escapar(e.tipo)}<br>${escapar(e.lugar)}</div>
      `).join('')
      return `<td class="${c.delMes ? '' : 'fuera'}">
        <div class="dia">${c.dia}</div>${c.delMes ? evs : ''}
      </td>`
    }).join('') + '</tr>'
  }

  const cabeceras = DIAS_SEMANA.map((d) => `<th>${d}</th>`).join('')

  const cuerpo = `
    <h2 class="titulo">Calendario · ${MESES[mes]} ${anio}</h2>
    <p class="subtitulo">Convocatorias, ensayos y citas del tercio</p>
    <table class="cal">
      <thead><tr>${cabeceras}</tr></thead>
      <tbody>${filas}</tbody>
    </table>
  `

  imprimir(`Calendario ${MESES[mes]} ${anio}`, cuerpo, 'landscape')
}

// =============================================================
//  PDF DEL LISTADO DE EVENTOS
// =============================================================

export function pdfCalendarioListado(eventos, titulo = 'Listado de convocatorias') {
  if (!eventos?.length) {
    alert('No hay eventos que exportar.')
    return
  }

  const filas = eventos.map((e) => `
    <tr>
      <td style="width:110px"><b>${fechaBonita(e.fecha_iso)}</b></td>
      <td style="width:60px">${escapar(e.hora)}</td>
      <td style="width:170px">${escapar(e.tipo)}</td>
      <td style="width:160px">${escapar(e.lugar)}</td>
      <td>${escapar(e.indicaciones || '—')}</td>
    </tr>
  `).join('')

  const cuerpo = `
    <h2 class="titulo">${escapar(titulo)}</h2>
    <p class="subtitulo">${eventos.length} convocatoria(s)</p>
    <table class="lista">
      <thead>
        <tr><th>Día</th><th>Hora</th><th>Motivo</th><th>Lugar</th><th>Indicaciones</th></tr>
      </thead>
      <tbody>${filas}</tbody>
    </table>
  `

  imprimir(titulo, cuerpo, 'landscape')
}
