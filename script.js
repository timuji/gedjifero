document.addEventListener('DOMContentLoaded', function () {
  const elements = {
    loginModal: document.getElementById('login-modal'),
    loginButton: document.getElementById('login-button'),
    operatorInput: document.getElementById('operator-name-input'),
    app: document.getElementById('app'),
    operatorName: document.getElementById('operator-name'),
    projectsContainer: document.getElementById('projects-container'),
    projectCount: document.getElementById('project-count'),
    startShiftBtn: document.getElementById('start-shift'),
    endShiftBtn: document.getElementById('end-shift'),
    pauseShiftBtn: document.getElementById('pause-shift-btn'),
    channelToggleBtn: document.getElementById('channel-toggle-button'),
    shiftTimer: document.getElementById('shift-timer'),
    callTimer: document.getElementById('call-timer'),
    pauseModal: document.getElementById('pause-modal'),
    pauseTimer: document.getElementById('pause-timer'),
    endPauseBtn: document.getElementById('end-pause-btn'),
    reportModal: document.getElementById('report-modal'),
    reportBody: document.getElementById('report-body'),
    closeReportBtn: document.getElementById('close-report'),
    statusIndicator: document.querySelector('.status-indicator'),
    editProjectsBtn: document.getElementById('edit-projects-btn'),
    editProjectsModal: document.getElementById('edit-projects-modal'),
    projectsEditContainer: document.getElementById('projects-edit-container'),
    addProjectBtn: document.getElementById('add-project-btn'),
    saveProjectsBtn: document.getElementById('save-projects-btn'),
    cancelEditBtn: document.getElementById('cancel-edit-btn'),
    editCallsModal: document.getElementById('edit-calls-modal'),
    editCallsProjectName: document.getElementById('edit-calls-project-name'),
    editCallsInput: document.getElementById('edit-calls-input'),
    saveCallsBtn: document.getElementById('save-calls-btn'),
    cancelEditCallsBtn: document.getElementById('cancel-edit-calls-btn')
  };

  const state = {
    operator: localStorage.getItem('operator') || null,
    shiftActive: localStorage.getItem('shiftActive') === 'true',
    shiftStartTime: +localStorage.getItem('shiftStartTime') || 0,
    shiftPaused: localStorage.getItem('shiftPaused') === 'true',
    pauseStartTime: +localStorage.getItem('pauseStartTime') || 0,
    totalPausedTime: +localStorage.getItem('totalPausedTime') || 0,
    currentCall: localStorage.getItem('currentCall') || null,
    callStartTime: +localStorage.getItem('callStartTime') || 0,
    channel: localStorage.getItem('channel') || 'Call Back',
    projects: JSON.parse(localStorage.getItem('projects')) || (() => {
      const defaultProjects = [];
      for (let i = 1; i <= 20; i++) {
        defaultProjects.push({
          name: `Проект ${i}`,
          calls: 0,
          status: 'inactive'
        });
      }
      return defaultProjects;
    })(),
    timers: { shift: null, call: null, pause: null },
    editingProject: null
  };

  function formatTime(seconds) {
    const h = String(Math.floor(seconds / 3600)).padStart(2, '0');
    const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
    const s = String(seconds % 60).padStart(2, '0');
    return `${h}:${m}:${s}`;
  }

  function saveState() {
    try {
      localStorage.setItem('operator', state.operator);
      localStorage.setItem('shiftActive', state.shiftActive);
      localStorage.setItem('shiftStartTime', state.shiftStartTime);
      localStorage.setItem('shiftPaused', state.shiftPaused);
      localStorage.setItem('pauseStartTime', state.pauseStartTime);
      localStorage.setItem('totalPausedTime', state.totalPausedTime);
      localStorage.setItem('currentCall', state.currentCall);
      localStorage.setItem('callStartTime', state.callStartTime);
      localStorage.setItem('channel', state.channel);
      localStorage.setItem('projects', JSON.stringify(state.projects));
      
      state.projects.forEach(p => {
        localStorage.setItem(`calls_${p.name}`, p.calls);
        localStorage.setItem(`status_${p.name}`, p.status);
      });
    } catch (e) {
      console.error('Ошибка сохранения:', e);
      if (e.name === 'QuotaExceededError') {
        localStorage.clear();
        alert('Переполнение хранилища. Данные очищены.');
      }
    }
  }

  function updateStatusIndicator() {
    const ind = elements.statusIndicator;
    ind.className = 'status-indicator';
    if (!state.shiftActive) ind.classList.add('inactive');
    else if (state.shiftPaused) ind.classList.add('paused');
    else if (state.currentCall) ind.classList.add('active-call');
    else ind.classList.add('active');
  }

  function renderProjects() {
    const fragment = document.createDocumentFragment();
    
    state.projects.forEach(project => {
      const card = document.createElement('div');
      card.className = `project-card ${project.status === 'active' ? 'active-call-card' : ''}`;
      const disabled = !state.shiftActive || state.shiftPaused || (state.currentCall && state.currentCall !== project.name);
      const reason = !state.shiftActive ? 'Смена не начата' :
                     state.shiftPaused ? 'Смена на паузе' :
                     state.currentCall && state.currentCall !== project.name ? 'Завершите текущий звонок' : '';
      
      card.innerHTML = `
        <h3>${project.name}</h3>
        <div>Звонков: ${project.calls}</div>
        <div>Канал: ${state.channel}</div>
        <div style="display: flex; gap: 10px; margin-top: 15px;">
          <button class="project-btn" data-project="${project.name}" ${disabled ? `disabled title="${reason}"` : ''}>
            ${project.status === 'active' ? 'Завершить' : 'Начать звонок'}
          </button>
          <button class="edit-calls-btn" data-project="${project.name}" title="Изменить количество звонков" style="padding: 12px; border-radius: 10px; border: 1px solid var(--accent); background: transparent; color: var(--accent); cursor: pointer; transition: var(--transition);">
            ✏️
          </button>
        </div>
      `;
      fragment.appendChild(card);
    });
    
    elements.projectsContainer.innerHTML = '';
    elements.projectsContainer.appendChild(fragment);
    elements.projectCount.textContent = `Проектов: ${state.projects.length}`;
  }

  function startTimer(type) {
    stopTimer(type);
    state.timers[type] = setInterval(() => {
      const now = Date.now();
      let seconds;
      if (type === 'shift') {
        seconds = Math.floor((now - state.shiftStartTime - state.totalPausedTime) / 1000);
        elements.shiftTimer.textContent = formatTime(seconds);
      } else if (type === 'call') {
        seconds = Math.floor((now - state.callStartTime) / 1000);
        elements.callTimer.textContent = formatTime(seconds);
      } else if (type === 'pause') {
        seconds = Math.floor((now - state.pauseStartTime) / 1000);
        elements.pauseTimer.textContent = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
      }
    }, 1000);
  }

  function stopTimer(type) {
    if (state.timers[type]) {
      clearInterval(state.timers[type]);
      state.timers[type] = null;
    }
  }

  function handleLogin() {
    const name = elements.operatorInput.value.trim();
    if (!name) return alert("Введите имя оператора!");
    state.operator = name;
    elements.operatorName.textContent = name;
    elements.loginModal.classList.remove('active');
    elements.app.style.display = 'block';
    saveState();
    renderProjects();
    updateStatusIndicator();
    elements.startShiftBtn.disabled = state.shiftActive;
  }

  function startShift() {
    if (!state.operator) {
      alert("Сначала введите имя оператора!");
      return;
    }
    
    state.shiftActive = true;
    state.shiftStartTime = Date.now();
    state.totalPausedTime = 0;
    startTimer('shift');
    elements.startShiftBtn.disabled = true;
    saveState();
    renderProjects();
    updateStatusIndicator();
    elements.shiftTimer.parentElement.classList.add('active');
  }

  function endShift() {
    stopTimer('shift');
    stopTimer('call');
    stopTimer('pause');
    
    if (state.currentCall) {
      const project = state.projects.find(p => p.name === state.currentCall);
      if (project) {
        project.status = 'inactive';
        project.calls++;
      }
    }
    
    showReport();
    state.currentCall = null;
    elements.shiftTimer.parentElement.classList.remove('active');
    elements.callTimer.parentElement.classList.remove('active');
    elements.startShiftBtn.disabled = false;
  }

  function toggleChannel() {
    state.channel = state.channel === 'Call Back' ? 'Hot Line' : 'Call Back';
    elements.channelToggleBtn.textContent = state.channel;
    saveState();
    renderProjects();
  }

  function togglePause() {
    if (state.shiftPaused) endPause();
    else startPause();
  }

  function startPause() {
    if (!state.shiftActive) return;
    state.shiftPaused = true;
    state.pauseStartTime = Date.now();
    stopTimer('shift');
    
    if (state.currentCall) {
      stopTimer('call');
      elements.callTimer.textContent = 'Пауза';
    }
    
    elements.pauseModal.classList.add('active');
    startTimer('pause');
    saveState();
    renderProjects();
    updateStatusIndicator();
  }

  function endPause() {
    state.shiftPaused = false;
    state.totalPausedTime += Date.now() - state.pauseStartTime;
    elements.pauseModal.classList.remove('active');
    stopTimer('pause');
    
    if (state.shiftActive) startTimer('shift');
    if (state.currentCall) {
      state.callStartTime += Date.now() - state.pauseStartTime;
      startTimer('call');
    }
    
    saveState();
    renderProjects();
    updateStatusIndicator();
  }

  function showReport() {
    const duration = state.shiftStartTime ? Math.floor((Date.now() - state.shiftStartTime - state.totalPausedTime) / 1000) : 0;
    const totalCalls = state.projects.reduce((sum, p) => sum + p.calls, 0);
    
    const formatDate = ts => {
        const d = new Date(ts);
        return `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getFullYear()}`;
    };
    
    const getTimeInterval = () => {
        const startHour = new Date(state.shiftStartTime).getHours();
        if (startHour >= 18 || startHour < 6) {
            return '20:00 - 08:00';
        } else {
            return '08:00 - 20:00';
        }
    };
    
    const getChannelName = () => {
        return state.channel === 'Call Back' ? 'CallBack' : 'HotLine';
    };
    
    const timeInterval = getTimeInterval();
    const currentDate = formatDate(Date.now());
    const channelName = getChannelName();
    
    const projectsWithCalls = state.projects.filter(p => p.calls > 0);
    
    elements.reportBody.innerHTML = `
        <div class="report-header" style="text-align: left; margin-bottom: 30px;">
            <div style="font-size: 24px; font-weight: bold; color: var(--accent); margin-bottom: 10px;">
                ${currentDate}    ${timeInterval} ( ${state.operator} )
            </div>
        </div>
        
        <div style="margin-top: 20px;">
            ${projectsWithCalls.map(p => `
                <div style="margin-bottom: 15px; padding: 15px; background: rgba(212, 175, 55, 0.05); border-radius: 8px; border-left: 4px solid var(--accent);">
                    <div style="font-weight: 600; color: var(--accent); margin-bottom: 8px; font-size: 18px;">${p.name}</div>
                    <div style="font-size: 16px;">${channelName} - ${p.calls}</div>
                </div>
            `).join('')}
            
            ${projectsWithCalls.length === 0 ? `
                <div style="text-align: center; opacity: 0.7; padding: 40px; font-style: italic; font-size: 16px;">
                    Нет звонков за смену
                </div>
            ` : ''}
        </div>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid rgba(212, 175, 55, 0.2);">
            <div style="font-weight: 600; color: var(--accent);">Всего звонков: ${totalCalls}</div>
        </div>
    `;
    
    elements.reportModal.classList.add('active');
  }

  function openEditCallsModal(projectName) {
    const project = state.projects.find(p => p.name === projectName);
    if (project) {
      state.editingProject = project;
      elements.editCallsProjectName.textContent = projectName;
      elements.editCallsInput.value = project.calls;
      elements.editCallsModal.classList.add('active');
    }
  }

  function saveEditedCalls() {
    if (state.editingProject) {
      const newCalls = parseInt(elements.editCallsInput.value) || 0;
      if (newCalls >= 0) {
        state.editingProject.calls = newCalls;
        saveState();
        renderProjects();
        elements.editCallsModal.classList.remove('active');
        state.editingProject = null;
      } else {
        alert('Количество звонков не может быть отрицательным!');
      }
    }
  }

  function resetShiftData() {
    state.projects.forEach(p => {
      p.calls = 0;
      p.status = 'inactive';
      localStorage.removeItem(`calls_${p.name}`);
      localStorage.removeItem(`status_${p.name}`);
    });
    
    Object.assign(state, {
      shiftStartTime: 0,
      callStartTime: 0,
      pauseStartTime: 0,
      totalPausedTime: 0,
      currentCall: null,
      shiftActive: false,
      shiftPaused: false
    });
    
    ['shiftActive','shiftStartTime','shiftPaused','pauseStartTime','totalPausedTime','currentCall','callStartTime']
      .forEach(k => localStorage.removeItem(k));
    
    elements.shiftTimer.textContent = '00:00:00';
    elements.callTimer.textContent = '00:00:00';
    elements.pauseTimer.textContent = '00:00';
    
    saveState();
    renderProjects();
    updateStatusIndicator();
    elements.startShiftBtn.disabled = false;
  }

  function closeReport() {
    elements.reportModal.classList.remove('active');
    resetShiftData();
  }

  function openEditProjectsModal() {
    renderProjectsEditList();
    elements.editProjectsModal.classList.add('active');
  }

  function renderProjectsEditList() {
    elements.projectsEditContainer.innerHTML = '';
    
    state.projects.forEach((project, index) => {
      const projectDiv = document.createElement('div');
      projectDiv.style.display = 'flex';
      projectDiv.style.alignItems = 'center';
      projectDiv.style.marginBottom = '10px';
      
      const input = document.createElement('input');
      input.type = 'text';
      input.value = project.name;
      input.className = 'project-input';
      input.dataset.index = index;
      
      const deleteBtn = document.createElement('button');
      deleteBtn.textContent = '🗑️';
      deleteBtn.className = 'delete-project-btn';
      deleteBtn.onclick = () => {
        if (state.projects.length > 1) {
          localStorage.removeItem(`calls_${project.name}`);
          localStorage.removeItem(`status_${project.name}`);
          
          state.projects.splice(index, 1);
          renderProjectsEditList();
        } else {
          alert('Должен остаться хотя бы один проект!');
        }
      };
      
      projectDiv.appendChild(input);
      projectDiv.appendChild(deleteBtn);
      elements.projectsEditContainer.appendChild(projectDiv);
    });
  }

  function saveProjects() {
    const inputs = elements.projectsEditContainer.querySelectorAll('.project-input');
    
    inputs.forEach((input, index) => {
      const newName = input.value.trim();
      if (newName && state.projects[index]) {
        if (state.projects[index].name !== newName) {
          localStorage.setItem(`calls_${newName}`, state.projects[index].calls);
          localStorage.setItem(`status_${newName}`, state.projects[index].status);
          
          localStorage.removeItem(`calls_${state.projects[index].name}`);
          localStorage.removeItem(`status_${state.projects[index].name}`);
          
          state.projects[index].name = newName;
        }
      }
    });
    
    saveState();
    renderProjects();
    elements.editProjectsModal.classList.remove('active');
  }

  function addNewProject() {
    const newProject = {
      name: `Новый проект ${state.projects.length + 1}`,
      calls: 0,
      status: 'inactive'
    };
    state.projects.push(newProject);
    renderProjectsEditList();
  }

  // Обработчики событий
  elements.loginButton.addEventListener('click', handleLogin);
  elements.operatorInput.addEventListener('keypress', e => e.key === 'Enter' && handleLogin());
  elements.startShiftBtn.addEventListener('click', startShift);
  elements.endShiftBtn.addEventListener('click', endShift);
  elements.pauseShiftBtn.addEventListener('click', togglePause);
  elements.channelToggleBtn.addEventListener('click', toggleChannel);
  elements.endPauseBtn.addEventListener('click', endPause);
  elements.closeReportBtn.addEventListener('click', closeReport);
  elements.editProjectsBtn.addEventListener('click', openEditProjectsModal);
  elements.addProjectBtn.addEventListener('click', addNewProject);
  elements.saveProjectsBtn.addEventListener('click', saveProjects);
  elements.cancelEditBtn.addEventListener('click', () => {
    elements.editProjectsModal.classList.remove('active');
  });
  elements.saveCallsBtn.addEventListener('click', saveEditedCalls);
  elements.cancelEditCallsBtn.addEventListener('click', () => {
    elements.editCallsModal.classList.remove('active');
    state.editingProject = null;
  });
  elements.editCallsInput.addEventListener('keypress', e => {
    if (e.key === 'Enter') saveEditedCalls();
  });

  elements.editProjectsModal.addEventListener('click', (e) => {
    if (e.target === elements.editProjectsModal) {
      elements.editProjectsModal.classList.remove('active');
    }
  });

  elements.editCallsModal.addEventListener('click', (e) => {
    if (e.target === elements.editCallsModal) {
      elements.editCallsModal.classList.remove('active');
      state.editingProject = null;
    }
  });

  elements.projectsContainer.addEventListener('click', e => {
    const btn = e.target.closest('.project-btn');
    if (btn && !btn.disabled) {
      const name = btn.dataset.project;
      const project = state.projects.find(p => p.name === name);
      
      if (project) {
        if (project.status === 'active') {
          project.status = 'inactive';
          project.calls++;
          stopTimer('call');
          state.currentCall = null;
          elements.callTimer.textContent = '00:00:00';
          elements.callTimer.parentElement.classList.remove('active');
        } else {
          state.projects.forEach(p => p.status = 'inactive');
          project.status = 'active';
          state.currentCall = name;
          state.callStartTime = Date.now();
          startTimer('call');
          elements.callTimer.parentElement.classList.add('active');
        }
        
        saveState();
        renderProjects();
        updateStatusIndicator();
      }
    }
    
    const editBtn = e.target.closest('.edit-calls-btn');
    if (editBtn) {
      const projectName = editBtn.dataset.project;
      openEditCallsModal(projectName);
    }
  });

  // Автоинициализация
  if (state.operator) {
    elements.operatorName.textContent = state.operator;
    elements.loginModal.classList.remove('active');
    elements.app.style.display = 'block';
    elements.startShiftBtn.disabled = state.shiftActive;
    
    if (state.shiftActive && !state.shiftPaused) {
      const currentTime = Date.now();
      const elapsed = currentTime - state.shiftStartTime - state.totalPausedTime;
      state.shiftStartTime = currentTime - elapsed;
      
      startTimer('shift');
      elements.shiftTimer.parentElement.classList.add('active');
    }
    
    if (state.currentCall) {
      startTimer('call');
      elements.callTimer.parentElement.classList.add('active');
    }
    
    renderProjects();
    updateStatusIndicator();
  }
});
