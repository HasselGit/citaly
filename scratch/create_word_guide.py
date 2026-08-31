import zipfile
import os

docx_path = r"c:\Users\Usuario\Desktop\Citaly\Guia_Arquitectura_Multi_Negocio_Citaly.docx"

# XML Components for a valid, rich Word Document (.docx)
content_types = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>"""

rels = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>"""

word_rels = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>"""

styles_xml = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault>
      <w:rPr>
        <w:rFonts w:ascii="Inter" w:hAnsi="Inter" w:cs="Arial"/>
        <w:sz w:val="22"/>
        <w:color w:val="0F172A"/>
      </w:rPr>
    </w:rPrDefault>
  </w:docDefaults>
</w:styles>"""

# Function to build paragraphs
def p(text, style="body", bold=False, size=22, color="0F172A", align="left", space_before=100, space_after=100):
    b_tag = "<w:b/>" if bold else ""
    jc_tag = f'<w:jc w:val="{align}"/>' if align != "left" else ""
    return f"""<w:p>
  <w:pPr>
    <w:spacing w:before="{space_before}" w:after="{space_after}"/>
    {jc_tag}
  </w:pPr>
  <w:r>
    <w:rPr>
      {b_tag}
      <w:sz w:val="{size}"/>
      <w:color w:val="{color}"/>
    </w:rPr>
    <w:t xml:space="preserve">{text}</w:t>
  </w:r>
</w:p>"""

def bullet(text, bold_prefix="", text_after=""):
    return f"""<w:p>
  <w:pPr>
    <w:pStyle w:val="ListParagraph"/>
    <w:spacing w:before="60" w:after="60"/>
    <w:ind w:left="400"/>
  </w:pPr>
  <w:r>
    <w:rPr><w:b/><w:sz w:val="22"/><w:color w:val="0F172A"/></w:rPr>
    <w:t xml:space="preserve">• {bold_prefix} </w:t>
  </w:r>
  <w:r>
    <w:rPr><w:sz w:val="22"/><w:color w:val="334155"/></w:rPr>
    <w:t xml:space="preserve">{text_after}</w:t>
  </w:r>
</w:p>"""

doc_body = []

# Title & Subtitle
doc_body.append(p("GUÍA DE ARQUITECTURA MULTI-NEGOCIO (SAAS)", bold=True, size=36, color="0F172A", align="center", space_before=200, space_after=100))
doc_body.append(p("Citaly / TuTurno: Dominios, URLs Dinámicas, Vercel Serverless y WhatsApp Meta API", bold=True, size=24, color="D97706", align="center", space_before=0, space_after=300))
doc_body.append(p("Este documento técnico y de negocio explica paso a paso cómo escalar la plataforma Citaly a múltiples negocios (odontólogos, médicos, estéticas) utilizando un único despliegue central en Vercel, gestión de dominios y mensajería en Meta Cloud API.", size=22, color="64748B", space_before=0, space_after=300))

# Section 1
doc_body.append(p("1. ¿Por qué NO clonar el proyecto para cada cliente?", bold=True, size=28, color="0F172A", space_before=300, space_after=120))
doc_body.append(p("En la industria del software moderna, clonar el código para cada cliente nuevo es un antipatrón costoso e inmantenible. La solución profesional es una Arquitectura SaaS Multi-Tenant (Multi-Inquilino):", size=22))
doc_body.append(bullet("Mantenimiento Centralizado:", "Un solo código:", "Cualquier mejora, nuevo diseño o corrección de bugs se despliega en 5 segundos y se actualiza inmediatamente para los 100 o 1,000 clientes a la vez."))
doc_body.append(bullet("Aislamiento Lógico de Datos:", "Seguridad por Tenant ID:", "Todos los clientes comparten la misma base de datos PostgreSQL, pero cada registro (turnos, servicios, pacientes) tiene su columna 'tenant_id'. Un negocio jamás ve los turnos de otro."))
doc_body.append(bullet("Costos de Infraestructura Cero o Mínimos:", "Vercel Serverless:", "Un solo proyecto en Vercel atiende a todos los negocios bajo demanda, escalando automáticamente sin pagar un hosting separado por cliente."))

# Section 2
doc_body.append(p("2. Gestión de URLs y Dominios en Vercel", bold=True, size=28, color="0F172A", space_before=300, space_after=120))
doc_body.append(p("Tenés dos opciones para ofrecer a los negocios según el plan que te contraten:", size=22))

doc_body.append(p("Opción A: Subdominios o Slugs en tu Dominio Central (100% Automático y Gratis)", bold=True, size=24, color="1E293B", space_before=150, space_after=80))
doc_body.append(p("1. Comprás tu dominio de marca (ej: tuturno.io o citaly.app) por aprox. $10 USD al año.", size=22))
doc_body.append(p("2. En Vercel Dashboard -> Settings -> Domains agregás tu dominio con 1 clic.", size=22))
doc_body.append(p("3. Cada doctor tiene su URL propia de reserva de forma instantánea sin configurar nada:", size=22))
doc_body.append(bullet("Dr. Alejandro Pérez:", "https://citaly.app/dr-perez", "-> Carga su logo, tratamientos y agenda."))
doc_body.append(bullet("Clínica Dental Norte:", "https://citaly.app/clinica-norte", "-> Carga sus profesionales y horarios."))
doc_body.append(bullet("Estética Valeria:", "https://citaly.app/valeria-estetica", "-> Carga sus servicios de estética."))

doc_body.append(p("Opción B: Dominio Propio / Marca Blanca (Plan Premium VIP)", bold=True, size=24, color="1E293B", space_before=150, space_after=80))
doc_body.append(p("Si un doctor grande o clínica quiere que figure su propia web (ej: turnos.drperez.com):", size=22))
doc_body.append(bullet("Configuración DNS del cliente:", "Registro CNAME:", "El doctor crea un CNAME 'turnos' apuntando a 'cname.vercel-dns.com'."))
doc_body.append(bullet("Vercel Custom Domain:", "Asignación:", "Agregás ese dominio en Vercel Domains y el sistema lo vincula a su tenant_id."))
doc_body.append(bullet("Monetización extra:", "Up-selling:", "Podés cobrar un adicional de $15 a $30 USD/mes por la función de 'Marca Blanca / Dominio Propio'."))

# Section 3
doc_body.append(p("3. Integración de WhatsApp y Meta Cloud API para Múltiples Negocios", bold=True, size=28, color="0F172A", space_before=300, space_after=120))
doc_body.append(p("Para los mensajes de WhatsApp tenés dos modelos según tu estrategia comercial:", size=22))

doc_body.append(p("Modelo 1: Servicio Gestionado Centralizado (Recomendado)", bold=True, size=24, color="1E293B", space_before=150, space_after=80))
doc_body.append(bullet("Operación:", "Tu cuenta de Meta:", "Todas las confirmaciones y recordatorios salen desde tu número o cuenta central verificado de Citaly."))
doc_body.append(bullet("Personalización:", "Plantilla Dinámica:", "El mensaje incluye automáticamente las variables: 'Hola {{1}}, te confirmamos tu turno en {{2}} (Nombre del Consultorio) para {{3}} el día {{4}}'."))
doc_body.append(bullet("Ventaja Total:", "Cero fricción:", "El odontólogo no tiene que hacer ningún trámite con Meta ni poner tarjeta de crédito. Vos le cobrás una suscripción mensual fija (ej: $35 USD/mes) y absorbés el micro-costo de Meta ($0.01 por plantilla), quedándote con un margen del 95%."))

doc_body.append(p("Modelo 2: WhatsApp Propio del Negocio (Bring Your Own Number)", bold=True, size=24, color="1E293B", space_before=150, space_after=80))
doc_body.append(bullet("Base de Datos preparada:", "Campos por Tenant:", "La tabla 'tenants' almacena 'whatsapp_phone_number_id' y 'whatsapp_token' independientes por cada consultorio."))
doc_body.append(bullet("Uso:", "Clínicas corporativas:", "Si una clínica exige que los mensajes salgan con su propio chip verificado, configuran su WABA ID en el panel y los mensajes se debitan de su propia cuenta."))

# Section 4
doc_body.append(p("4. Flujo de Trabajo para Dar de Alta un Nuevo Negocio", bold=True, size=28, color="0F172A", space_before=300, space_after=120))
doc_body.append(bullet("Paso 1:", "Registro del Tenant:", "Se crea una fila en la tabla 'tenants' con 'subdomain = dr-gonzalez', 'business_name = Consultorio Dr. González'."))
doc_body.append(bullet("Paso 2:", "Carga de Servicios:", "Se agregan sus tratamientos a la tabla 'services' vinculados con su 'tenant_id'."))
doc_body.append(bullet("Paso 3:", "Entrega del Enlace:", "Se le entrega su URL 'https://citaly.app/dr-gonzalez' y el acceso a su Dashboard '/dashboard'."))
doc_body.append(bullet("Paso 4:", "Cobro Recurrente:", "Se configura el cobro mensual automatizado (vía Mercado Pago o Stripe)."))

# Section 5
doc_body.append(p("5. Resumen de Seguridad, Concurrencia y Sincronización en Vivo", bold=True, size=28, color="0F172A", space_before=300, space_after=120))
doc_body.append(bullet("Anti-Double Booking:", "Bloqueo Atómico:", "PostgreSQL valida solapamientos en milisegundos y responde 409 Conflict si dos pacientes intentan reservar el mismo slot simultáneamente."))
doc_body.append(bullet("Live Refresh en PWA:", "Tiempo Real:", "La pantalla de turnos consulta la disponibilidad en segundo plano cada 5 segundos y al reenfocar la ventana, actualizando slots libres y ocupados sin recargar la página."))
doc_body.append(bullet("Filtrado Inteligente en Agenda:", "Visibilidad Práctica:", "Los horarios pasados del día se filtran automáticamente de la vista de 'Libres', asegurando que solo se listen turnos agendables a futuro."))

doc_xml = f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    {''.join(doc_body)}
    <w:sectPr>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/>
    </w:sectPr>
  </w:body>
</w:document>"""

# Create the .docx zip archive
with zipfile.ZipFile(docx_path, 'w', zipfile.ZIP_DEFLATED) as docx:
    docx.writestr('[Content_Types].xml', content_types)
    docx.writestr('_rels/.rels', rels)
    docx.writestr('word/_rels/document.xml.rels', word_rels)
    docx.writestr('word/styles.xml', styles_xml)
    docx.writestr('word/document.xml', doc_xml)

print(f"Documento Word generado con éxito en: {docx_path}")
