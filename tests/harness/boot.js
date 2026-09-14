window.__errors = [];
window.addEventListener('error', (e) => window.__errors.push(String(e.message)));
window.addEventListener('unhandledrejection', (e) => window.__errors.push('promise: ' + String(e.reason)));
import('/src/components/index.js')
  .then(() => import('/src/game/missions.js'))
  .then((mm) => { window.__quizCorrect = mm.QUIZ.map((q) => q.correct); return import('/src/game/game.js'); })
  .then((m) => {
    m.initGame();
    const boot = document.getElementById('boot');
    if (boot) boot.remove();          // main.js does this in the real build
    window.__booted = true;
  })
  .catch((err) => { window.__errors.push('boot: ' + (err && err.stack || err)); });
