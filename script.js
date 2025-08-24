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
    pauseTotalTimer: document.getElementById('pause-total-timer'),
    pauseModal: document.getElementById('pause-modal'),
    pauseTimer: document.getElementById('pause-timer'),
    endPauseBtn: document.getElementById('end-pause-btn'),
    reportModal: document.getElementById('report-modal'),
    reportBody: document.getElementById('report-body'),
    closeReportBtn: document.getElementById('close-report'),
    exportCsvBtn: document.getElementById('export-csv'),
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
    cancelEditCallsBtn: document.getElementById('cancel-edit-calls-btn'),
    confirmChannelModal: document.getElementById('confirm-channel-modal'),
    currentChannelName: document.getElementById('current-channel-name'),
    newChannelName: document.getElementById('new-channel-name'),
    confirmChannelChange: document.getElementById('confirm-channel-change'),
    cancelChannelChange: document.getElementById('cancel-channel-change'),
    confirmEndShiftModal: document.getElementById('confirm-end-shift-modal'),
    shiftDurationConfirm: document.getElementById('shift-duration-confirm'),
    totalCallsConfirm: document.getElementById('total-calls-confirm'),
    confirmEndShift: document.getElementById('confirm-end-shift'),
    cancelEndShift: document.getElementById('cancel-end-shift')
  };

  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  const state = {
    operator: null,
    shiftActive: false,
    shiftStartTime: 0,
    shiftElapsed: 0,
    shiftPaused: false,
    pauseStartTime: 0,
    pauseElapsed: 0,
    pauseTotalElapsed: 0,
    currentCall: null,
    callStartTime: 0,
    callElapsed: 0,
    channel: 'Call Back',
    projects: [],
    mainTimer: null,
    editingProject: null,
    lastUpdate: 0,
    pendingChannelChange: null
  };

  function formatTime(seconds) {
    const h = String(Math.floor(seconds / 3600)).padStart(2, '0');
    const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
    const s = String(seconds % 60).padStart(2, '0');
    return `${h}:${m}:${s}`;
  }

  function loadState() {
    try {
      const saved = localStorage.getItem('gedjifero_state');
      if (saved) {
        const data = JSON.parse(saved);
        
        state.operator = data.operator || null;
        state.shiftActive = data.shiftActive || false;
        state.shiftStartTime = data.shiftStartTime || 0;
        state.shiftElapsed = data.shiftElapsed || 0;
        state.shiftPaused = data.shiftPaused || false;
        state.pauseStartTime = data.pauseStartTime || 0;
        state.pauseElapsed = data.pauseElapsed || 0;
        state.pauseTotalElapsed = data.pauseTotalElapsed || 0;
        state.currentCall = data.currentCall || null;
        state.callStartTime = data.callStartTime || 0;
        state.callElapsed = data.callElapsed || 0;
        state.channel = data.channel || 'Call Back';
        state.projects = data.projects || [];
        
        if (state.shiftActive && !state.shiftPaused) {
          const currentTime = Date.now();
          const elapsed = currentTime - state.shiftStartTime;
          state.shiftStartTime = currentTime - state.shiftElapsed;
          state.shiftElapsed = elapsed;
        }
      } else {
        for (let i = 1; i <= 5; i++) {
          state.projects.push({
            name: `Проект ${i}`,
            calls: 0,
            status: 'inactive'
          });
        }
      }
    } catch (e) {
      console.error('Ошибка загрузки:', e);
      for (let i = 1; i <= 5; i++) {
        state.projects.push({
          name: `Проект ${i}`,
          calls: 0,
          status: 'inactive'
        });
      }
    }
  }

  const saveStateDebounced = debounce(() => {
    try {
      const data = {
        operator: state.operator,
        shiftActive: state.shiftActive,
        shiftStartTime: state.shiftStartTime,
        shiftElapsed: state.shiftElapsed,
        shiftPaused: state.shiftPaused,
        pauseStartTime: state.pauseStartTime,
        pauseElapsed: state.pauseElapsed,
        pauseTotalElapsed: state.pauseTotalElapsed,
        currentCall: state.currentCall,
        callStartTime: state.callStartTime,
        callElapsed: state.callElapsed,
        channel: state.channel,
        projects: state.projects
      };
      
      localStorage.setItem('gedjifero_state', JSON.stringify(data));
    } catch (e) {
      console.error('Ошибка сохранения:', e);
      if (e.name === 'QuotaExceededError') {
        localStorage.clear();
        alert('Переполнение хранилища. Данные очищены.');
      }
    }
  }, 1000);

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
          <button class="edit-calls-btn" data-project="${project.name}" title="Изменить количество звонков">
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

  function startMainTimer() {
    stopMainTimer();
    state.lastUpdate = Date.now();
    
    state.mainTimer = setInterval(() => {
      const now = Date.now();
      const delta = now - state.lastUpdate;
      state.lastUpdate = now;
      
      updateTimers(delta);
    }, 100);
  }

  function stopMainTimer() {
    if (state.mainTimer) {
      clearInterval(state.mainTimer);
      state.mainTimer = null;
    }
  }

  function updateTimers(delta) {
    if (state.shiftActive && !state.shiftPaused) {
      state.shiftElapsed += delta;
      elements.shiftTimer.textContent = formatTime(Math.floor(state.shiftElapsed / 1000));
      elements.shiftTimer.parentElement.classList.add('active');
    } else {
      elements.shiftTimer.parentElement.classList.remove('active');
    }
    
    if (state.currentCall && !state.shiftPaused) {
      state.callElapsed += delta;
      elements.callTimer.textContent = formatTime(Math.floor(state.callElapsed / 1000));
      elements.callTimer.parentElement.classList.add('active');
    } else {
      elements.callTimer.parentElement.classList.remove('active');
    }
    
    elements.pauseTotalTimer.textContent = formatTime(Math.floor(state.pauseTotalElapsed / 1000));
    
    if (state.shiftPaused) {
      state.pauseElapsed += delta;
      const currentPauseSeconds = Math.floor((state.pauseElapsed - state.pauseTotalElapsed) / 1000);
      const minutes = String(Math.floor(currentPauseSeconds / 60)).padStart(2, '0');
      const seconds = String(currentPauseSeconds % 60).padStart(2, '0');
      elements.pauseTimer.textContent = `${minutes}:${seconds}`;
      elements.pauseTotalTimer.parentElement.classList.add('paused');
    } else {
      elements.pauseTotalTimer.parentElement.classList.remove('paused');
    }
  }

  function handleLogin() {
    const name = elements.operatorInput.value.trim();
    if (!name) return alert("Введите имя оператора!");
    state.operator = name;
    elements.operatorName.textContent = name;
    elements.loginModal.classList.remove('active');
    elements.app.style.display = 'block';
    saveStateDebounced();
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
    state.shiftElapsed = 0;
    state.pauseTotalElapsed = 0;
    state.shiftPaused = false;
    
    startMainTimer();
    elements.startShiftBtn.disabled = true;
    saveStateDebounced();
    renderProjects();
    updateStatusIndicator();
  }

  function endShift() {
    stopMainTimer();
    
    if (state.currentCall) {
      const project = state.projects.find(p => p.name === state.currentCall);
      if (project) {
        project.status = 'inactive';
        project.calls++;
      }
    }
    
    showReport();
    state.currentCall = null;
    state.callElapsed = 0;
    saveStateDebounced();
  }

  function toggleChannel() {
    const newChannel = state.channel === 'Call Back' ? 'Hot Line' : 'Call Back';
    
    elements.currentChannelName.textContent = state.channel;
    elements.newChannelName.textContent = newChannel;
    elements.confirmChannelModal.classList.add('active');
    
    state.pendingChannelChange = newChannel;
  }

  function confirmChannelChange() {
    if (state.pendingChannelChange) {
      state.channel = state.pendingChannelChange;
      elements.channelToggleBtn.textContent = state.channel;
      saveStateDebounced();
      renderProjects();
      
      showNotification(`Канал изменен на: ${state.channel}`, 'success');
    }
    
    elements.confirmChannelModal.classList.remove('active');
    state.pendingChannelChange = null;
  }

  function cancelChannelChange() {
    elements.confirmChannelModal.classList.remove('active');
    state.pendingChannelChange = null;
  }

  function togglePause() {
    if (state.shiftPaused) endPause();
    else startPause();
  }

  function startPause() {
    if (!state.shiftActive) return;
    state.shiftPaused = true;
    state.pauseStartTime = Date.now();
    
    elements.pauseModal.classList.add('active');
    saveStateDebounced();
    renderProjects();
    updateStatusIndicator();
  }

  function endPause() {
    state.shiftPaused = false;
    const pauseDuration = Date.now() - state.pauseStartTime;
    state.pauseTotalElapsed += pauseDuration;
    
    elements.pauseModal.classList.remove('active');
    
    saveStateDebounced();
    renderProjects();
    updateStatusIndicator();
  }

  function showEndShiftConfirmation() {
    const totalSeconds = Math.floor(state.shiftElapsed / 1000);
    const totalCalls = state.projects.reduce((sum, p) => sum + p.calls, 0);
    
    elements.shiftDurationConfirm.textContent = formatTime(totalSeconds);
    elements.totalCallsConfirm.textContent = totalCalls;
    elements.confirmEndShiftModal.classList.add('active');
  }

  function confirmEndShift() {
    elements.confirmEndShiftModal.classList.remove('active');
    endShift();
  }

  function cancelEndShift() {
    elements.confirmEndShiftModal.classList.remove('active');
  }

  function showReport() {
    const totalSeconds = Math.floor(state.shiftElapsed / 1000);
    const totalCalls = state.projects.reduce((sum, p) => sum + p.calls, 0);
    
    const formatDate = ts => {
        const d = new Date(ts);
        return `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getFullYear()}`;
    };
    
    const currentDate = formatDate(Date.now());
    const channelName = state.channel === 'Call Back' ? 'CallBack' : 'HotLine';
    
    const projectsWithCalls = state.projects.filter(p => p.calls > 0);
    
    elements.reportBody.innerHTML = `
        <div class="report-header">
            <h2>Отчет за ${currentDate}</h2>
            <p><strong>Оператор:</strong> ${state.operator}</p>
            <p><strong>Время смены:</strong> ${formatTime(totalSeconds)}</p>
            <p><strong>Канал:</strong> ${channelName}</p>
            <p><strong>Всего звонков:</strong> ${totalCalls}</p>
        </div>
        
        <div class="report-projects">
            <h3>Детализация по проектам</h3>
            ${projectsWithCalls.length > 0 ? `
                <table>
                    <thead>
                        <tr>
                            <th>Проект</th>
                            <th>Звонков</th>
                            <th>Канал</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${projectsWithCalls.map(p => `
                            <tr>
                                <td>${p.name}</td>
                                <td>${p.calls}</td>
                                <td>${channelName}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            ` : `
                <div style="text-align: center; opacity: 0.7; padding: 40px; font-style: italic;">
                    Нет звонков за смену
                </div>
            `}
        </div>
    `;
    
    elements.reportModal.classList.add('active');
  }

  function exportToCSV() {
    const channelName = state.channel === 'Call Back' ? 'CallBack' : 'HotLine';
    const rows = [['Проект', 'Звонки', 'Канал']];
    
    state.projects.forEach(p => {
      if (p.calls > 0) {
        rows.push([p.name, p.calls, channelName]);
      }
    });
    
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `отчет_${state.operator}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
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
        saveStateDebounced();
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
    });
    
    state.shiftStartTime = 0;
    state.shiftElapsed = 0;
    state.callStartTime = 0;
    state.callElapsed = 0;
    state.pauseStartTime = 0;
    state.pauseElapsed = 0;
    state.pauseTotalElapsed = 0;
    state.currentCall = null;
    state.shiftActive = false;
    state.shiftPaused = false;
    
    elements.shiftTimer.textContent = '00:00:00';
    elements.callTimer.textContent = '00:00:00';
    elements.pauseTotalTimer.textContent = '00:00:00';
    elements.pauseTimer.textContent = '00:00';
    
    saveStateDebounced();
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
        state.projects[index].name = newName;
      }
    });
    
    saveStateDebounced();
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

  function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 100px;
      right: 20px;
      background: ${type === 'success' ? 'var(--success)' : type === 'error' ? 'var(--danger)' : 'var(--accent)'};
      color: white;
      padding: 15px 20px;
      border-radius: 8px;
      box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
      z-index: 3000;
      animation: slideIn 0.3s ease, fadeOut 0.3s ease 2.7s forwards;
      max-width: 300px;
      font-weight: 500;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 3000);
  }

  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideIn {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
    
    @keyframes fadeOut {
      from {
        opacity: 1;
        transform: translateX(0);
      }
      to {
        opacity: 0;
        transform: translateX(100%);
      }
    }
  `;
  document.head.appendChild(style);

  function init() {
    loadState();
    
    elements.loginButton.addEventListener('click', handleLogin);
    elements.operatorInput.addEventListener('keypress', e => e.key === 'Enter' && handleLogin());
    elements.startShiftBtn.addEventListener('click', startShift);
    elements.endShiftBtn.addEventListener('click', showEndShiftConfirmation);
    elements.pauseShiftBtn.addEventListener('click', togglePause);
    elements.channelToggleBtn.addEventListener('click', toggleChannel);
    elements.endPauseBtn.addEventListener('click', endPause);
    elements.closeReportBtn.addEventListener('click', closeReport);
    elements.exportCsvBtn.addEventListener('click', exportToCSV);
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
    elements.confirmChannelChange.addEventListener('click', confirmChannelChange);
    elements.cancelChannelChange.addEventListener('click', cancelChannelChange);
    elements.confirmEndShift.addEventListener('click', confirmEndShift);
    elements.cancelEndShift.addEventListener('click', cancelEndShift);

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

    elements.confirmChannelModal.addEventListener('click', (e) => {
      if (e.target === elements.confirmChannelModal) {
        cancelChannelChange();
      }
    });

    elements.confirmEndShiftModal.addEventListener('click', (e) => {
      if (e.target === elements.confirmEndShiftModal) {
        cancelEndShift();
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
            state.currentCall = null;
            state.callElapsed = 0;
          } else {
            state.projects.forEach(p => p.status = 'inactive');
            project.status = 'active';
            state.currentCall = name;
            state.callStartTime = Date.now();
            state.callElapsed = 0;
          }
          
          saveStateDebounced();
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

    if (state.operator) {
      elements.operatorName.textContent = state.operator;
      elements.loginModal.classList.remove('active');
      elements.app.style.display = 'block';
      elements.startShiftBtn.disabled = state.shiftActive;
      elements.channelToggleBtn.textContent = state.channel;
      
      if (state.shiftActive) {
        startMainTimer();
      }
      
      renderProjects();
      updateStatusIndicator();
    }
  }

  init();
});
