# Informes de sesión

Cada sesión de trabajo deja acá un informe, `AAAA-MM-DD-NN-<slug>.md` (NN es
el número del encargo en `docs/prompts/`), que el orquestador lee para decidir
el paso siguiente. El orquestador no lee código ni datos: decide con lo que
diga acá. Por eso el resumen de diez líneas va arriba y todo número lleva su
comando al lado.

El formato completo, con las reglas, está en
`.claude/skills/orquestador/references/plantilla-informe.md`. Los campos:

```
# <slug> — <fecha>
## Resumen                      hasta diez líneas: qué quedó, números, qué está abierto
## Encargo                      una línea
## Hecho                        qué existe ahora; commits con hash; qué no se tocó
## Probado                      suites por exit code y conteo; corridas reales con comandos
## Queda abierto                lo que no se cerró y por qué; deuda vista
## Para que pruebe Hernán      sólo si hay front o algo manual
## Preguntas para el orquestador  numeradas, con opciones
```
