// SPA Navigation Logic
const sections = [
  'profile',
  'meal',
  'workout',
  'progress',
  'dashboard'
];

function showSection(section) {
  sections.forEach(sec => {
    document.getElementById(`${sec}-section`).style.display = (sec === section) ? 'block' : 'none';
    const navLink = document.getElementById(`nav-${sec}`);
    if (navLink) {
      if (sec === section) {
        navLink.classList.add('active');
      } else {
        navLink.classList.remove('active');
      }
    }
  });
  if (section === 'dashboard') updateDashboard();
}

document.addEventListener('DOMContentLoaded', () => {
  // Set up nav links
  sections.forEach(sec => {
    document.getElementById(`nav-${sec}`).addEventListener('click', (e) => {
      e.preventDefault();
      showSection(sec);
    });
  });
  // Show profile by default
  showSection('profile');

  // Render saved profiles on every load
  renderSavedProfiles();
  // Always clear the profile form on load
  clearProfileForm();

  // Profile form logic
  const profileForm = document.getElementById('profile-form');
  const profileSuccess = document.getElementById('profile-success');
  // Body type SVG selection logic
  const bodyTypeLabels = document.querySelectorAll('#bodyType-options label');
  const bodyTypeInputs = document.querySelectorAll('#bodyType-options input[type=radio]');
  bodyTypeLabels.forEach(label => {
    label.addEventListener('click', function() {
      bodyTypeLabels.forEach(l => l.classList.remove('selected'));
      this.classList.add('selected');
      this.querySelector('input').checked = true;
    });
  });
  // Load profile if exists
  const savedProfile = JSON.parse(localStorage.getItem('userProfile'));
  if (savedProfile) {
    Object.keys(savedProfile).forEach(key => {
      if (profileForm[key]) profileForm[key].value = savedProfile[key];
    });
    // Set body type SVG selection
    if (savedProfile.bodyType) {
      bodyTypeInputs.forEach(input => {
        if (input.value === savedProfile.bodyType) {
          input.checked = true;
          input.parentElement.classList.add('selected');
        }
      });
    }
    // Set name if exists
    if (savedProfile.name) {
      profileForm['name'].value = savedProfile.name;
    }
  }
  profileForm.addEventListener('submit', function(e) {
    e.preventDefault();
    const data = {};
    Array.from(profileForm.elements).forEach(el => {
      if (el.name) data[el.name] = el.value;
    });
    let profiles = getProfiles();
    let key = data.name.toLowerCase().replace(/\s+/g, '_');
    if (!profiles.find(p => p.key === key)) {
      profiles.push({ name: data.name, key });
      saveProfiles(profiles);
    }
    setProfileData(key, data);
    renderSavedProfiles();
    clearProfileForm();
    rerenderAllSections();
    document.getElementById('profile-success').style.display = 'block';
    setTimeout(() => { document.getElementById('profile-success').style.display = 'none'; }, 2000);
  });

  // Meal plan button
  const mealBtn = document.getElementById('generate-meal-plan');
  if (mealBtn) {
    mealBtn.addEventListener('click', genereazaPlanAlimentar);
  }

  // Workout plan button
  const workoutBtn = document.getElementById('generate-workout-plan');
  if (workoutBtn) {
    workoutBtn.addEventListener('click', genereazaPlanSala);
  }

  // Progress log form
  const progressForm = document.getElementById('progress-form');
  if (progressForm) {
    progressForm.addEventListener('submit', function(e) {
      e.preventDefault();
      const key = getCurrentProfileKey();
      const date = progressForm['log-date'].value;
      const weight = progressForm['log-weight'].value;
      const workout = progressForm['log-workout'].value;
      const logs = getProfileLogs(key);
      logs.push({ date, weight, workout });
      setProfileLogs(key, logs);
      renderProgressLog();
      setTimeout(deseneazaGraficProgres, 100);
      progressForm.reset();
    });
    document.querySelector('#progress-log-table tbody').addEventListener('click', function(e) {
      if (e.target.matches('button[data-remove]')) {
        const key = getCurrentProfileKey();
        const idx = e.target.getAttribute('data-remove');
        let logs = getProfileLogs(key);
        logs.splice(idx, 1);
        setProfileLogs(key, logs);
        renderProgressLog();
        setTimeout(deseneazaGraficProgres, 100);
      }
    });
    renderProgressLog();
  }

  // Logo click logic
  const logoLink = document.getElementById('logo-link');
  if (logoLink) {
    logoLink.addEventListener('click', () => showSection('dashboard'));
  }

  // Progress chart
  if (window.Chart) deseneazaGraficProgres();
  // Redraw chart on progress log update
  if (progressForm) {
    progressForm.addEventListener('submit', function() {
      setTimeout(deseneazaGraficProgres, 100);
    });
  }

  renderSavedProfiles();

  // Clear profile form on load
  clearProfileForm();
});

// --- Meal Planner Logic (Romanian, profile-based) ---
const zile = ['Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri', 'Sâmbătă', 'Duminică'];
const meseExemplu = [
  // Example Romanian meals (replace with more if needed)
  { meniu: 'Omletă cu legume', proteine: 18, carbo: 8, grasimi: 20, ingrediente: ['Ouă', 'Ardei', 'Spanac', 'Brânză'] },
  { meniu: 'Piept de pui cu orez', proteine: 32, carbo: 45, grasimi: 8, ingrediente: ['Piept de pui', 'Orez', 'Broccoli'] },
  { meniu: 'Salată grecească', proteine: 12, carbo: 10, grasimi: 14, ingrediente: ['Roșii', 'Castraveți', 'Brânză feta', 'Măsline'] },
  { meniu: 'Somon la grătar', proteine: 28, carbo: 6, grasimi: 22, ingrediente: ['Somon', 'Cartofi', 'Lămâie'] },
  { meniu: 'Tocană de legume', proteine: 10, carbo: 30, grasimi: 7, ingrediente: ['Dovlecel', 'Morcov', 'Fasole', 'Ceapă'] },
  { meniu: 'Iaurt cu fructe și nuci', proteine: 15, carbo: 25, grasimi: 10, ingrediente: ['Iaurt', 'Fructe', 'Nuci'] },
  { meniu: 'Wrap cu curcan', proteine: 22, carbo: 40, grasimi: 10, ingrediente: ['Curcan', 'Lipie integrală', 'Salată'] },
];

function calculeazaCalorii(profile) {
  // Mifflin-St Jeor BMR
  let bmr = 0;
  if (!profile) return 2000;
  const greutate = parseFloat(profile.weight) || 70;
  const inaltime = 170; // default, can add field
  const varsta = parseInt(profile.age) || 25;
  if (profile.gender === 'male' || profile.gender === 'Masculin') {
    bmr = 10 * greutate + 6.25 * inaltime - 5 * varsta + 5;
  } else {
    bmr = 10 * greutate + 6.25 * inaltime - 5 * varsta - 161;
  }
  // Activity multiplier
  let activ = 1.2;
  if (profile.activity === 'light' || profile.activity === 'Ușor activ') activ = 1.375;
  if (profile.activity === 'moderate' || profile.activity === 'Moderate activ') activ = 1.55;
  if (profile.activity === 'active' || profile.activity === 'Activ') activ = 1.725;
  if (profile.activity === 'veryactive' || profile.activity === 'Foarte activ') activ = 1.9;
  let tdee = bmr * activ;
  // Adjust for goal
  if (profile.goal === 'muscle' || profile.goal === 'Creștere masă musculară') tdee += 250;
  if (profile.goal === 'weightloss' || profile.goal === 'Slăbire') tdee -= 400;
  return Math.round(tdee);
}

function calculeazaMacronutrienti(calorii, profile) {
  // Standard: 30% proteine, 40% carbo, 30% grasimi (can adjust by goal)
  let p = 0.3, c = 0.4, g = 0.3;
  if (profile.goal === 'muscle' || profile.goal === 'Creștere masă musculară') p = 0.32, c = 0.43, g = 0.25;
  if (profile.goal === 'weightloss' || profile.goal === 'Slăbire') p = 0.35, c = 0.35, g = 0.3;
  const proteine = Math.round((calorii * p) / 4);
  const carbo = Math.round((calorii * c) / 4);
  const grasimi = Math.round((calorii * g) / 9);
  return { proteine, carbo, grasimi };
}

function genereazaPlanAlimentar() {
  const key = getCurrentProfileKey();
  const zile = ['Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri', 'Sâmbătă', 'Duminică'];
  const tbody = document.querySelector('#meal-plan-table tbody');
  tbody.innerHTML = '';
  let toateIngredientele = [];
  for (let i = 0; i < 7; i++) {
    const micDejun = meseMicDejun[i % meseMicDejun.length];
    const pranz = mesePranz[i % mesePranz.length];
    const cina = meseCina[i % meseCina.length];
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style='padding:0.5rem;'>${zile[i]}</td>
      <td style='padding:0.5rem;'>${micDejun}</td>
      <td style='padding:0.5rem;'>${pranz}</td>
      <td style='padding:0.5rem;'>${cina}</td>
    `;
    tbody.appendChild(tr);
    toateIngredientele.push(...micDejun.split(' '), ...pranz.split(' '), ...cina.split(' '));
  }
  // Listă cumpărături
  const shoppingList = document.getElementById('shopping-list');
  shoppingList.innerHTML = '';
  renderShoppingList([...new Set(toateIngredientele)]);
  document.getElementById('meal-plan-container').style.display = 'block';
  localStorage.setItem('mealPlanGenerated_' + key, '1');
  updateDashboard();
}

// --- Workout Planner Logic (Romanian, 3 zile sală/săptămână, cu SVG-uri) ---
const planSala = [
  {
    zi: 'Luni',
    exercitii: [
      { nume: 'Genuflexiuni cu haltera', svg: 'assets/ex_gym1.svg', serii: 4, repetari: '10', pauza: '90s' },
      { nume: 'Împins la piept cu bara', svg: 'assets/ex_gym2.svg', serii: 4, repetari: '8', pauza: '90s' },
      { nume: 'Tracțiuni la bară', svg: 'assets/ex_gym3.svg', serii: 3, repetari: 'max', pauza: '90s' }
    ]
  },
  {
    zi: 'Miercuri',
    exercitii: [
      { nume: 'Îndreptări', svg: 'assets/ex_gym4.svg', serii: 4, repetari: '8', pauza: '120s' },
      { nume: 'Ramat cu bara', svg: 'assets/ex_gym5.svg', serii: 4, repetari: '10', pauza: '90s' },
      { nume: 'Flotări la paralele', svg: 'assets/ex_gym6.svg', serii: 3, repetari: 'max', pauza: '90s' }
    ]
  },
  {
    zi: 'Vineri',
    exercitii: [
      { nume: 'Presă la umeri', svg: 'assets/ex_gym7.svg', serii: 4, repetari: '10', pauza: '90s' },
      { nume: 'Biceps cu gantere', svg: 'assets/ex_gym8.svg', serii: 3, repetari: '12', pauza: '60s' },
      { nume: 'Abdomene', svg: 'assets/ex_gym9.svg', serii: 3, repetari: '15', pauza: '60s' }
    ]
  }
];

function genereazaPlanSala() {
  const key = getCurrentProfileKey();
  const nivel = document.getElementById('workout-difficulty').selectedOptions[0].text;
  const dif = dificultateEx[nivel] || dificultateEx['Începător'];
  const tbody = document.querySelector('#workout-plan-table tbody');
  tbody.innerHTML = '';
  planSala.forEach(ziua => {
    ziua.exercitii.forEach((ex, idx) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style='padding:0.5rem;'>${idx === 0 ? ziua.zi : ''}</td>
        <td style='padding:0.5rem; display:flex; align-items:center; gap:0.7rem; justify-content:center;'>
          <img src='${ex.svg}' alt='' style='width:32px; height:32px; border-radius:8px; background:#e0eafc;'>
          <span>${ex.nume}</span>
        </td>
        <td style='padding:0.5rem;'>${dif.serii}</td>
        <td style='padding:0.5rem;'>${dif.repetari}</td>
        <td style='padding:0.5rem;'>${dif.pauza}</td>
      `;
      tbody.appendChild(tr);
    });
  });
  document.getElementById('workout-plan-container').style.display = 'block';
  localStorage.setItem('workoutPlanGenerated_' + key, '1');
  updateDashboard();
}

// --- Progress Log Logic ---
function renderProgressLog() {
  const key = getCurrentProfileKey();
  const logs = getProfileLogs(key);
  const tbody = document.querySelector('#progress-log-table tbody');
  tbody.innerHTML = '';
  logs.forEach((log, idx) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style='padding:0.5rem;'>${log.date}</td>
      <td style='padding:0.5rem;'>${log.weight}</td>
      <td style='padding:0.5rem;'>${log.workout}</td>
      <td style='padding:0.5rem; text-align:center;'><button class='btn' style='padding:0.2rem 0.8rem; font-size:0.9rem;' data-remove='${idx}'>✕</button></td>
    `;
    tbody.appendChild(tr);
  });
}

// --- Dashboard Logic ---
function updateDashboard() {
  const key = getCurrentProfileKey();
  const profile = getProfileData(key);
  const welcome = document.getElementById('dashboard-welcome');
  if (profile && profile.name) {
    let gen = '';
    if (profile.gender === 'male' || profile.gender === 'Masculin') gen = 'Masculin';
    else if (profile.gender === 'female' || profile.gender === 'Feminin') gen = 'Feminin';
    else gen = profile.gender || '';
    welcome.textContent = `Bine ai venit, ${profile.name}! Ești gata să-ți atingi obiectivele?`;
  } else {
    welcome.textContent = 'Bine ai venit! Completează profilul pentru recomandări personalizate.';
  }
  // Profil sumar
  const profileDiv = document.getElementById('dashboard-profile');
  if (profile) {
    profileDiv.innerHTML = `
      <div><b>Tip:</b> ${profile.bodyType || '-'}</div>
      <div><b>Obiectiv:</b> ${profile.goal || '-'}</div>
      <div><b>Dietă:</b> ${profile.diet || '-'}</div>
      <div><b>Activitate:</b> ${profile.activity || '-'}</div>
    `;
  } else {
    profileDiv.textContent = 'Profil incomplet.';
  }
  // Mese săptămâna aceasta
  const mealsDiv = document.getElementById('dashboard-meals');
  const mealPlan = localStorage.getItem('mealPlanGenerated_' + key);
  mealsDiv.textContent = mealPlan ? 'Plan alimentar generat' : 'Niciun plan alimentar generat.';
  // Antrenamente săptămâna aceasta
  const workoutsDiv = document.getElementById('dashboard-workouts');
  const workoutPlan = localStorage.getItem('workoutPlanGenerated_' + key);
  workoutsDiv.textContent = workoutPlan ? 'Plan de antrenament generat' : 'Niciun plan de antrenament generat.';
  // Progres
  const progressDiv = document.getElementById('dashboard-progress');
  const logs = getProfileLogs(key);
  progressDiv.textContent = logs.length ? `${logs.length} înregistrări` : 'Nicio înregistrare.';
  // Motivație
  const motivation = document.getElementById('dashboard-motivation');
  if (logs.length > 0) {
    motivation.textContent = `Felicitări! Ai adăugat ${logs.length} actualizări de progres. Continuă tot așa!`;
  } else {
    motivation.textContent = 'Începe să-ți monitorizezi progresul pentru a-ți vedea evoluția!';
  }
}

// --- Plan alimentar cu 3 mese pe zi ---
const meseMicDejun = [
  'Omletă cu legume', 'Iaurt cu fructe și nuci', 'Fulgi de ovăz cu lapte', 'Toast integral cu avocado', 'Smoothie cu banană și spanac', 'Brânză cu roșii și castraveți', 'Ouă fierte cu salată verde'
];
const mesePranz = [
  'Piept de pui cu orez', 'Salată grecească', 'Somon la grătar cu cartofi', 'Tocană de legume', 'Curcan cu quinoa', 'Paste integrale cu ton', 'Supă cremă de linte'
];
const meseCina = [
  'Salată de ton cu fasole', 'Orez cu legume și tofu', 'Sote de broccoli cu pui', 'Pește la cuptor cu legume', 'Supă de pui', 'Brânză cottage cu legume', 'Omletă cu ciuperci'
];

// --- Grafic progres cu Chart.js ---
function deseneazaGraficProgres() {
  if (!window.Chart) return;
  const ctx = document.getElementById('progress-chart-canvas').getContext('2d');
  const logs = (JSON.parse(localStorage.getItem('progressLogs')) || []).sort((a, b) => new Date(a.date) - new Date(b.date));
  const labels = logs.map(l => l.date);
  const data = logs.map(l => parseFloat(l.weight));
  if (window.progresChart) window.progresChart.destroy();
  window.progresChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Greutate (kg)',
        data,
        borderColor: '#3e497a',
        backgroundColor: 'rgba(62,73,122,0.08)',
        tension: 0.3,
        pointRadius: 4,
        pointBackgroundColor: '#232946',
        fill: true
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: { enabled: true }
      },
      scales: {
        x: { title: { display: true, text: 'Dată' } },
        y: { title: { display: true, text: 'Greutate (kg)' }, beginAtZero: false }
      }
    }
  });
}

// --- Profile management ---
function getProfiles() {
  return JSON.parse(localStorage.getItem('profilesList')) || [];
}
function saveProfiles(list) {
  localStorage.setItem('profilesList', JSON.stringify(list));
}
function getCurrentProfileKey() {
  return localStorage.getItem('currentProfileKey') || null;
}
function setCurrentProfileKey(key) {
  localStorage.setItem('currentProfileKey', key);
}
function getProfileData(key) {
  return JSON.parse(localStorage.getItem('profile_' + key));
}
function setProfileData(key, data) {
  localStorage.setItem('profile_' + key, JSON.stringify(data));
}
function getProfileLogs(key) {
  return JSON.parse(localStorage.getItem('logs_' + key)) || [];
}
function setProfileLogs(key, logs) {
  localStorage.setItem('logs_' + key, JSON.stringify(logs));
}
function getShoppingListState(key) {
  return JSON.parse(localStorage.getItem('shopping_' + key)) || {};
}
function setShoppingListState(key, state) {
  localStorage.setItem('shopping_' + key, JSON.stringify(state));
}

function rerenderAllSections() {
  updateDashboard();
  // Reafișează plan alimentar pentru profilul curent
  if (document.getElementById('meal-plan-container')) {
    genereazaPlanAlimentar();
  }
  // Reafișează antrenamente pentru profilul curent
  if (document.getElementById('workout-plan-container')) {
    genereazaPlanSala();
  }
  // Reafișează progresul pentru profilul curent
  if (typeof renderProgressLog === 'function') {
    renderProgressLog();
  }
  // Reafișează graficul de progres
  if (typeof deseneazaGraficProgres === 'function') {
    deseneazaGraficProgres();
  }
}

function renderSavedProfiles() {
  const list = getProfiles();
  const ul = document.getElementById('saved-profiles-list');
  ul.innerHTML = '';
  const current = getCurrentProfileKey();
  list.forEach(profile => {
    const li = document.createElement('li');
    li.style.display = 'flex';
    li.style.alignItems = 'center';
    li.style.gap = '0.5rem';
    // Nume profil
    const span = document.createElement('span');
    span.textContent = profile.name;
    span.style.cursor = 'pointer';
    span.onclick = () => {
      setCurrentProfileKey(profile.key);
      renderSavedProfiles();
      loadProfileToForm(profile.key);
      rerenderAllSections();
    };
    li.appendChild(span);
    // Buton ștergere
    const del = document.createElement('button');
    del.textContent = '✕';
    del.title = 'Șterge profilul';
    del.style.background = 'none';
    del.style.border = 'none';
    del.style.color = '#c00';
    del.style.fontSize = '1.1rem';
    del.style.cursor = 'pointer';
    del.onclick = (e) => {
      e.stopPropagation();
      let profiles = getProfiles().filter(p => p.key !== profile.key);
      saveProfiles(profiles);
      localStorage.removeItem('profile_' + profile.key);
      localStorage.removeItem('logs_' + profile.key);
      localStorage.removeItem('shopping_' + profile.key);
      if (getCurrentProfileKey() === profile.key) {
        if (profiles.length > 0) {
          setCurrentProfileKey(profiles[0].key);
        } else {
          setCurrentProfileKey('');
        }
      }
      renderSavedProfiles();
      rerenderAllSections();
    };
    li.appendChild(del);
    if (profile.key === current) {
      li.classList.add('selected');
      li.setAttribute('aria-current', 'true');
    }
    ul.appendChild(li);
  });
}

function loadProfileToForm(key) {
  clearProfileForm();
  const data = getProfileData(key);
  if (!data) return;
  const form = document.getElementById('profile-form');
  Object.keys(data).forEach(k => { if (form[k]) form[k].value = data[k]; });
  // Set body type SVG
  const bodyTypeInputs = document.querySelectorAll('#bodyType-options input[type=radio]');
  bodyTypeInputs.forEach(input => {
    input.checked = (input.value === data.bodyType);
    if (input.checked) input.parentElement.classList.add('selected');
    else input.parentElement.classList.remove('selected');
  });
}

// --- Shopping list with checkboxes ---
function renderShoppingList(items) {
  const key = getCurrentProfileKey();
  const state = getShoppingListState(key);
  const shoppingList = document.getElementById('shopping-list');
  shoppingList.innerHTML = '';
  items.forEach(item => {
    if (item.length > 2) {
      const li = document.createElement('li');
      const label = document.createElement('label');
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = !!state[item];
      cb.onchange = () => {
        state[item] = cb.checked;
        setShoppingListState(key, state);
      };
      const span = document.createElement('span');
      span.textContent = item;
      label.appendChild(cb);
      label.appendChild(span);
      li.appendChild(label);
      shoppingList.appendChild(li);
    }
  });
}

// --- Workout difficulty sorting ---
const dificultateEx = {
  'Începător': { serii: 3, repetari: 10, pauza: '90s' },
  'Intermediar': { serii: 4, repetari: 12, pauza: '75s' },
  'Avansat': { serii: 5, repetari: 15, pauza: '60s' }
};

function clearProfileForm() {
  const profileForm = document.getElementById('profile-form');
  Array.from(profileForm.elements).forEach(el => {
    if (el.tagName === 'INPUT' || el.tagName === 'SELECT') {
      if (el.type === 'radio' || el.type === 'checkbox') {
        el.checked = false;
        if (el.parentElement.classList) el.parentElement.classList.remove('selected');
      } else {
        el.value = '';
      }
    }
  });
} 