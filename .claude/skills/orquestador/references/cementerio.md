# Cementerio del método

Lo que se intentó y falló, con fecha y con lo que costó. Cada entrada es una
regla que ya está en SKILL.md o en `reglas-de-sesion.md`; acá está el porqué.

**2026-09-12 · El estado del proyecto escrito en el prompt.** El primer prompt
del orquestador decía "el encargo 01 está por correr"; ya estaba construido.
Se pudrió el mismo día. → El estado vive en archivos que se leen al arrancar;
el prompt y la skill no llevan fechas ni "dónde estamos".

**2026-09-12 · El boilerplate repetido en cada prompt.** La regla del front,
el orden de lectura y el cierre iban copiados en cada encargo; cada copia
derivaba. → Lo fijo vive en la skill `/encargo` del repo; el prompt lleva
sólo lo específico.

**2026-09-14 · Dos sesiones y un índice de git.** Una sesión commiteó con
`git add ruta && git commit` y se llevó cuatro líneas que otra tenía a medio
hacer en el mismo archivo. → Dos sesiones nunca editan el mismo archivo;
commit sólo con `git commit -- rutas`.

**2026-09-15 · El `git mv` ajeno.** Una sesión de documentos commiteó y el
commit se llevó un renombre que otra sesión había dejado staged. Y otra vez
con 38 borrados de otra sesión. → `git diff --cached --name-only` vacío al
empezar y sólo archivos propios antes de cada commit; `git mv`/`git rm` en el
mismo comando que su commit; nunca `stash`.

**2026-09-15 · El motor a medio escribir.** Una sesión corrió el análisis
sobre material real mientras otras dos editaban el motor: la primera corrida
reventó con un `NameError`, la segunda anduvo, y los números resultaron no
reproducibles desde HEAD. → Una sesión que corre el sistema sobre material no
coincide con otra que edita el código que importa. Máximo dos sesiones.

**2026-09-15 · Una sesión terminó sin commitear.** El contrato 2.0.0 entero
quedó en el árbol y otra sesión dependía de él; la segunda tuvo que
commitearlo con un mensaje que dijera de quién era. → Nunca terminar sin
commitear; si no se puede cerrar, commitear lo entero y decir qué falta.

**2026-09-15 · Tests con fechas y conteos quemados.** Un test con una fecha
literal se puso rojo al pasar la medianoche; otro con `== 12` se puso rojo
cuando otra sesión agregó dos métricas al registro. → Afirmar contra la
fuente que cambia (la hora, el registro), nunca contra un literal que otro
puede mover.

**2026-09-15 · La palabra "passed".** `addopts = "-q"` sumado al `-q` de la
línea de comandos daba `-qq` y no imprimía el conteo; y el arnés terminaba
con exit 134 después del resumen verde. → Los tests se leen por exit code y
conteo. Un abort al cerrar es un bug, no ruido.

**2026-09-15 · Informes de 300 líneas.** Valiosos, pero el orquestador
tardaba una ronda en leer cuatro. → El resumen de diez líneas arriba de cada
informe; el cuerpo queda para quien lo necesite.

**2026-09-16 · Los primeros 21 juicios.** El sistema habilitó juicio en 21
números y una auditoría de 23 agentes bajó eso a 0: la aritmética era
exacta, pero la cámara derivaba, un evento caía en el swing siguiente y la
regla permitía juicio sin rango. → Auditar el primer resultado que alguien
va a usar, antes de mostrarlo. Conservador y reversible: apagar, no borrar.

**2026-09-16 · Siete agentes por prompt.** Verificar tres prompts contra el
código con siete agentes cada uno encontró más de veinte errores; también
costó más que los encargos. → Verificar con dos o tres, sólo los prompts que
tocan el núcleo, y decirlo en el plan.

**2026-09-18 · Un chip que abre un worktree.** Los chips de la app abren la
sesión en un worktree sin los archivos ignorados (venv, modelos, datos). →
El prompt del chip empieza con `cd <checkout principal>`; si no anda, texto.

**2026-09-20 · Dos agentes en el mismo checkout.** Medido: tres procesos
commiteando a la vez sobre un checkout compartido logran 17 commits de 180, y
quedan 75 archivos escritos que git nunca registró. El modo de falla es lo
grave: `git add` pierde la carrera por `.git/index.lock` y el `git commit`
siguiente dice «nothing added to commit but untracked files present», que no
parece un error. Es el mismo fantasma que se llevó media `padel-coach`. Ocho
worktrees en paralelo: 480 commits de 480, cero fallos. → Un worktree por
sesión, sin excepción.

**2026-09-20 · Ocho merges al mismo tiempo.** Los worktrees aíslan el trabajo
pero no la integración: ocho ramas mergeando al checkout principal a la vez
dan 1 de 8, el resto muere sobre `index.lock`. Con `flock`, 8 de 8. → El
trabajo se paraleliza; la integración va por `scripts/integrar`, de a una.

**2026-09-20 · El symlink del entorno en el worktree.** Era el camino obvio
para que un worktree tuviera el `.venv`: funciona, y rompe de costado. Un
`.gitignore` con `.venv/` matchea el directorio pero no el symlink, así que
`git add -A` lo commitea como ruta absoluta; y `git worktree remove` vacía el
entorno original. Hay repos públicos rotos así. → El venv del checkout
principal se invoca por ruta absoluta y el worktree se pone en `PYTHONPATH`.
Medido en `kinelab`: 389 tests en verde sin un solo enlace.

**2026-09-20 · `import` desde el directorio equivocado.** Con un paquete
instalado en modo editable, correr desde un cwd que no es el worktree importa
el código del checkout principal: la sesión edita una copia y prueba la otra,
sin ningún error. → `PYTHONPATH` apuntando al worktree, siempre, y dicho en
el §0 de la skill del repo.

**2026-09-20 · Automatizar sin dejar de mirar.** La cadena de encargos le
saca al dueño los clics, no los ojos. SlopCodeBench midió que el código de un
agente que extiende su propio trabajo se degrada de forma continua —la
complejidad ciclomática media sube de 27 a 68 en una trayectoria— y que
ningún prompt cambia esa pendiente; los prompts de calidad bajan el punto de
partida y nada más. → Cada dos o tres encargos cerrados, el orquestador para
y le trae el conjunto al dueño.

**2026-09-20 · El marcador que quedó huérfano.** Matar una sesión de encargo a
mitad deja su marcador `encargo-en-curso` en el worktree, y el hook de cierre
después frena a cualquier otra sesión que pase por ahí pidiéndole un informe
que no le corresponde. Pasó la misma tarde en que se escribió el hook: el 34
se interrumpió y el marcador bloqueó a la sesión siguiente. → Un marcador con
otro número es huérfano y se borra, después de commitear con `WIP:` lo que el
que se fue dejó suelto. El mensaje del hook da la ruta exacta, así que siempre
se puede salir.

**2026-09-20 · La mitad de un método portado.** El orquestador de un segundo
proyecto recibió la cadena mientras su skill `/encargo` seguía diciéndole al
agente que se mudara al checkout principal. Habría puesto dos agentes en el
mismo checkout: el escenario donde se pierde el 90 % de los commits sin un
solo error a la vista. → El método se porta entero o no se porta: si un
proyecto no tiene medido su worktree, su orquestador **dice** que ahí se
entrega por chip, con el motivo escrito.
