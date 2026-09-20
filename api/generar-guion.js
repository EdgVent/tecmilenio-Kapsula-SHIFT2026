// Esta función corre en el servidor de Vercel, NUNCA en el navegador.
// Es el único lugar donde vive la llave de Anthropic, por lo que nadie
// que abra la página puede verla ni usarla.
//
// Requiere la variable de entorno ANTHROPIC_API_KEY configurada en
// Vercel (Settings > Environment Variables).

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(501).json({
      error: "Falta configurar ANTHROPIC_API_KEY en las variables de entorno de Vercel.",
    });
  }

  try {
    // En algunos entornos Vercel no parsea el body automáticamente,
    // así que lo leemos a mano si hace falta.
    let cuerpo = req.body;
    if (!cuerpo || typeof cuerpo === "string") {
      try {
        cuerpo = JSON.parse(cuerpo || "{}");
      } catch (e) {
        cuerpo = {};
      }
    }

    const { messages, model, max_tokens } = cuerpo || {};

    if (!messages) {
      return res.status(400).json({ error: "Falta el parámetro 'messages'." });
    }

    const respuesta = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: model || "claude-sonnet-5",
        max_tokens: max_tokens || 8000,
        messages,
      }),
    });

    const datos = await respuesta.json();

    if (!respuesta.ok) {
      // Devolvemos el detalle para poder diagnosticar desde la consola
      // del navegador si algo falla (modelo inválido, saldo, etc.).
      return res.status(respuesta.status).json({
        error: "El servicio de IA devolvió un error.",
        detalle: datos,
      });
    }

    return res.status(200).json(datos);
  } catch (err) {
    return res.status(500).json({
      error: "No se pudo contactar al servicio de IA.",
      detalle: err.message,
    });
  }
}
