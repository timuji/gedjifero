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
    exportPdfBtn: document.getElementById('export-pdf'),
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
    cancelEndShift: document.getElementById('cancel-end-shift'),
    bgSettingsBtn: document.getElementById('bg-settings-btn'),
    bgModal: document.getElementById('background-modal'),
    bgOptions: document.querySelectorAll('.bg-option'),
    bgUpload: document.getElementById('bg-upload'),
    previewBgBtn: document.getElementById('preview-bg'),
    resetBgBtn: document.getElementById('reset-bg'),
    saveBgBtn: document.getElementById('save-bg'),
    cancelBgBtn: document.getElementById('cancel-bg'),
    hotkeysToggle: document.getElementById('hotkeys-toggle'),
    hotkeysModal: document.getElementById('hotkeys-modal'),
    closeHotkeys: document.getElementById('close-hotkeys'),
    themeToggle: document.getElementById('theme-toggle')
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
    channels: ['Call Back', 'Hot Line'],
    projects: [],
    mainTimer: null,
    editingProject: null,
    lastUpdate: 0,
    pendingChannelChange: null,
    background: {
      type: 'gradient',
      value: 'gradient1',
      customImage: null
    },
    stats: {
      totalCalls: 0,
      avgCallDuration: 0,
      efficiency: 0
    }
  };

  function formatTime(seconds) {
    const h = String(Math.floor(seconds / 3600)).padStart(2, '0');
    const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
    const s = String(seconds % 60).padStart(2, '0');
    return `${h}:${m}:${s}`;
  }

  function formatTimeShort(seconds) {
    const m = String(Math.floor(seconds / 60)).padStart(2, '0');
    const s = String(seconds % 60).padStart(2, '0');
    return `${m}:${s}`;
  }

  function loadState() {
    try {
      const saved = localStorage.getItem('gedjifero_state');
      if (saved) {
        const data = JSON.parse(saved);
        Object.assign(state, data);
        
        // Восстановление состояния после перезагрузки
        if (state.shiftActive && !state.shiftPaused) {
          const now = Date.now();
          const elapsedSinceLastUpdate = now - state.lastUpdate;
          state.shiftElapsed += elapsedSinceLastUpdate;
          if (state.currentCall) {
            state.callElapsed += elapsedSinceLastUpdate;
          }
          startMainTimer();
        }
        
        // Применить сохраненный фон
        setTimeout(() => {
          applyBackground();
        }, 100);
        
      } else {
        for (let i = 1; i <= 5; i++) {
          state.projects.push({ name: `Проект ${i}`, calls: 0, status: 'inactive' });
        }
      }
    } catch (e) {
      console.error('Ошибка загрузки:', e);
    }
  }

  const saveStateDebounced = debounce(() => {
    try {
      state.lastUpdate = Date.now();
      localStorage.setItem('gedjifero_state', JSON.stringify(state));
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

  function updateChannelButton() {
    elements.channelToggleBtn.textContent = state.channel;
    
    // Добавляем иконку в зависимости от канала
    let icon = '📞';
    if (state.channel === 'Hot Line') icon = '🔥';
    
    elements.channelToggleBtn.innerHTML = `${icon} ${state.channel}`;
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
        <h3 contenteditable="true" onblur="updateProjectName('${project.name}', this.textContent)">${project.name}</h3>
        <div>Звонков: ${project.calls}</div>
        <div>Канал: ${state.channel}</div>
        <div style="display: flex; gap: 10px; margin-top: 15px;">
          <button class="project-btn" data-project="${project.name}" ${disabled ? `disabled title="${reason}"` : ''}>
            ${project.status === 'active' ? 'Завершить' : 'Начать звонок'}
          </button>
          <button class="edit-calls-btn" data-project="${project.name}" title="Изменить количество звонков">✏️</button>
        </div>
      `;
      fragment.appendChild(card);
    });
    elements.projectsContainer.innerHTML = '';
    elements.projectsContainer.appendChild(fragment);
    elements.projectCount.textContent = `Проектов: ${state.projects.length}`;
  }

  function updateProjectName(oldName, newName) {
    if (!newName.trim()) return;
    
    const project = state.projects.find(p => p.name === oldName);
    if (project && newName !== oldName) {
      project.name = newName.trim();
      if (state.currentCall === oldName) {
        state.currentCall = newName.trim();
      }
      saveStateDebounced();
      renderProjects();
    }
  }

  function renderProjectsEdit() {
    elements.projectsEditContainer.innerHTML = '';
    state.projects.forEach((project, index) => {
      const projectDiv = document.createElement('div');
      projectDiv.style.marginBottom = '15px';
      projectDiv.style.padding = '10px';
      projectDiv.style.background = 'rgba(0,0,0,0.2)';
      projectDiv.style.borderRadius = '8px';
      projectDiv.innerHTML = `
        <input type="text" class="project-input" value="${project.name}" data-index="${index}" 
               placeholder="Название проекта" style="margin-bottom: 5px;">
        <button class="delete-project-btn" data-index="${index}" title="Удалить проект">🗑️</button>
      `;
      elements.projectsEditContainer.appendChild(projectDiv);
    });
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
      const currentPauseTime = Date.now() - state.pauseStartTime;
      const currentPauseSeconds = Math.floor(currentPauseTime / 1000);
      elements.pauseTimer.textContent = formatTimeShort(currentPauseSeconds);
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
    updateChannelButton();
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
    state.pauseElapsed = 0;
    state.shiftPaused = false;
    startMainTimer();
    elements.startShiftBtn.disabled = true;
    saveStateDebounced();
    renderProjects();
    updateStatusIndicator();
  }

  function pauseShift() {
    if (!state.shiftActive || state.shiftPaused) return;
    
    state.shiftPaused = true;
    state.pauseStartTime = Date.now();
    elements.pauseModal.classList.add('active');
    updateStatusIndicator();
    saveStateDebounced();
  }

  function endPause() {
    if (!state.shiftPaused) return;
    
    const now = Date.now();
    const pauseDuration = now - state.pauseStartTime;
    state.pauseTotalElapsed += pauseDuration;
    state.pauseElapsed = state.pauseTotalElapsed;
    state.shiftPaused = false;
    
    elements.pauseModal.classList.remove('active');
    updateStatusIndicator();
    saveStateDebounced();
  }

  function showChannelChangeConfirmation(newChannel) {
    elements.currentChannelName.textContent = state.channel;
    elements.newChannelName.textContent = newChannel;
    elements.confirmChannelModal.classList.add('active');
    state.pendingChannelChange = newChannel;
  }

  function confirmChannelChange() {
    if (state.pendingChannelChange) {
      state.channel = state.pendingChannelChange;
      updateChannelButton();
      renderProjects();
      saveStateDebounced();
    }
    elements.confirmChannelModal.classList.remove('active');
    state.pendingChannelChange = null;
  }

  function cancelChannelChange() {
    elements.confirmChannelModal.classList.remove('active');
    state.pendingChannelChange = null;
  }

  function toggleChannel() {
    if (!state.shiftActive) {
      alert("Сначала начните смену!");
      return;
    }
    
    if (state.currentCall) {
      alert("Завершите текущий звонок перед сменой канала!");
      return;
    }
    
    const currentIndex = state.channels.indexOf(state.channel);
    const nextIndex = (currentIndex + 1) % state.channels.length;
    const newChannel = state.channels[nextIndex];
    
    showChannelChangeConfirmation(newChannel);
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

  function showEndShiftConfirmation() {
    if (!state.shiftActive) return;
    
    elements.shiftDurationConfirm.textContent = formatTime(Math.floor(state.shiftElapsed / 1000));
    elements.totalCallsConfirm.textContent = state.projects.reduce((sum, p) => sum + p.calls, 0);
    elements.confirmEndShiftModal.classList.add('active');
  }

  function confirmEndShift() {
    elements.confirmEndShiftModal.classList.remove('active');
    endShift();
  }

  function cancelEndShift() {
    elements.confirmEndShiftModal.classList.remove('active');
  }

  function updateStats() {
    const totalCalls = state.projects.reduce((sum, p) => sum + p.calls, 0);
    const totalShiftTime = state.shiftElapsed - state.pauseTotalElapsed;
    const productiveTime = state.callElapsed;
    
    state.stats.totalCalls = totalCalls;
    state.stats.avgCallDuration = totalCalls > 0 ? productiveTime / totalCalls : 0;
    state.stats.efficiency = totalShiftTime > 0 ? (productiveTime / totalShiftTime) * 100 : 0;
  }

  function showReport() {
    updateStats();
    
    const totalSeconds = Math.floor(state.shiftElapsed / 1000);
    const totalCalls = state.projects.reduce((sum, p) => sum + p.calls, 0);
    const currentDate = new Date().toLocaleDateString('ru-RU');
    const startTime = new Date(Date.now() - state.shiftElapsed).toLocaleTimeString('ru-RU', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    const endTime = new Date().toLocaleTimeString('ru-RU', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    
    let reportHTML = `
      <div style="font-size: 20px; margin-bottom: 20px;">${currentDate} ${startTime} - ${endTime} (${state.operator})</div>
    `;
    
    state.projects.forEach(project => {
      if (project.calls > 0) {
        reportHTML += `
          <div style="margin-bottom: 10px;">
            <div><b>${project.name}</b></div>
            <div>${state.channel} - ${project.calls}</div>
          </div>
        `;
      }
    });
    
    if (state.projects.every(p => p.calls === 0)) {
      reportHTML += `<div>Нет звонков за смену</div>`;
    }
    
    reportHTML += `
      <div style="margin-top: 20px; padding: 15px; background: rgba(0,0,0,0.2); border-radius: 8px;">
        <h3>📊 Статистика эффективности</h3>
        <div>Общее время работы: ${formatTime(Math.floor((state.shiftElapsed - state.pauseTotalElapsed) / 1000))}</div>
        <div>Продуктивное время: ${formatTime(Math.floor(state.callElapsed / 1000))}</div>
        <div>Эффективность: ${state.stats.efficiency.toFixed(1)}%</div>
        <div>Средняя длительность звонка: ${formatTimeShort(Math.floor(state.stats.avgCallDuration / 1000))}</div>
      </div>
    `;
    
    elements.reportBody.innerHTML = reportHTML;
    elements.reportModal.classList.add('active');
  }

  function exportToPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const totalSeconds = Math.floor(state.shiftElapsed / 1000);
    const totalCalls = state.projects.reduce((sum, p) => sum + p.calls, 0);
    const currentDate = new Date().toLocaleDateString('ru-RU');
    const startTime = new Date(Date.now() - state.shiftElapsed).toLocaleTimeString('ru-RU', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    const endTime = new Date().toLocaleTimeString('ru-RU', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    
    doc.setFontSize(16);
    doc.text(`${currentDate} ${startTime} - ${endTime} (${state.operator})`, 105, 20, { align: 'center' });
    doc.setFontSize(12);
    
    let y = 40;
    state.projects.forEach(p => {
      if (p.calls > 0) {
        doc.text(`${p.name}`, 20, y);
        doc.text(`${state.channel} - ${p.calls}`, 120, y);
        y += 10;
      }
    });
    
    if (state.projects.every(p => p.calls === 0)) {
      doc.text('Нет звонков за смену', 20, y);
      y += 10;
    }
    
    doc.text(`Всего звонков: ${totalCalls}`, 20, y + 15);
    doc.text(`Время смены: ${formatTime(totalSeconds)}`, 20, y + 25);
    doc.text(`Время пауз: ${formatTime(Math.floor(state.pauseTotalElapsed / 1000))}`, 20, y + 35);
    doc.text(`Эффективность: ${state.stats.efficiency.toFixed(1)}%`, 20, y + 45);
    
    doc.save(`отчет_${state.operator}_${new Date().toISOString().split('T')[0]}.pdf`);
  }

  function exportToCSV() {
    const currentDate = new Date().toLocaleDateString('ru-RU');
    const startTime = new Date(Date.now() - state.shiftElapsed).toLocaleTimeString('ru-RU');
    const endTime = new Date().toLocaleTimeString('ru-RU');
    
    let csv = `Отчет оператора: ${state.operator}\n`;
    csv += `Дата: ${currentDate}\n`;
    csv += `Период: ${startTime} - ${endTime}\n`;
    csv += `Канал: ${state.channel}\n\n`;
    csv += 'Проект,Количество звонков\n';
    
    state.projects.forEach(project => {
      if (project.calls > 0) {
        csv += `${project.name},${project.calls}\n`;
      }
    });
    
    csv += `\nВсего звонков:,${state.stats.totalCalls}\n`;
    csv += `Эффективность:,${state.stats.efficiency.toFixed(1)}%\n`;
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `отчет_${state.operator}_${currentDate.replace(/\./g, '-')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function resetShiftData() {
    state.projects.forEach(p => { p.calls = 0; p.status = 'inactive'; });
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
    state.channel = 'Call Back';
    elements.shiftTimer.textContent = '00:00:00';
    elements.callTimer.textContent = '00:00:00';
    elements.pauseTotalTimer.textContent = '00:00:00';
    elements.pauseTimer.textContent = '00:00';
    saveStateDebounced();
    renderProjects();
    updateStatusIndicator();
    updateChannelButton();
    elements.startShiftBtn.disabled = false;
  }

  function closeReport() {
    elements.reportModal.classList.remove('active');
    resetShiftData();
    state.operator = null;
    elements.operatorInput.value = '';
    elements.loginModal.classList.add('active');
    elements.app.style.display = 'none';
    saveStateDebounced();
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

  function openEditProjectsModal() {
    renderProjectsEdit();
    elements.editProjectsModal.classList.add('active');
  }

  function addNewProject() {
    state.projects.push({ name: `Новый проект ${state.projects.length + 1}`, calls: 0, status: 'inactive' });
    renderProjectsEdit();
    saveStateDebounced();
  }

  function saveProjects() {
    // Сохраняем изменения названий проектов
    const inputs = elements.projectsEditContainer.querySelectorAll('.project-input');
    inputs.forEach(input => {
      const index = parseInt(input.dataset.index);
      const newName = input.value.trim();
      if (newName && index >= 0 && index < state.projects.length) {
        state.projects[index].name = newName;
      }
    });
    
    elements.editProjectsModal.classList.remove('active');
    renderProjects();
    saveStateDebounced();
  }

  function deleteProject(index) {
    if (state.projects.length <= 1) {
      alert('Должен остаться хотя бы один проект!');
      return;
    }
    
    if (confirm('Удалить этот проект?')) {
      state.projects.splice(index, 1);
      renderProjectsEdit();
      saveStateDebounced();
    }
  }

  // Функции для работы с фоном
  function applyBackground() {
    const body = document.body;
    
    // Удаляем предыдущие классы
    body.classList.remove('custom-bg', 'custom-bg-img');
    
    switch (state.background.type) {
      case 'gradient':
        applyGradientBackground(state.background.value);
        break;
      case 'color':
        applyColorBackground(state.background.value);
        break;
      case 'image':
        applyImageBackground(state.background.value);
        break;
    }
  }

  function applyGradientBackground(gradientId) {
    const gradients = {
      gradient1: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #2a2a2a 100%)',
      gradient2: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
      gradient3: 'linear-gradient(135deg, #2c3e50 0%, #34495e 50%, #2c3e50 100%)',
      gradient4: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 50%, #1e3c72 100%)',
      gradient5: 'linear-gradient(135deg, #4b006e 0%, #8e44ad 50%, #4b006e 100%)',
      gradient6: 'linear-gradient(135deg, #c0392b 0%, #e74c3c 50%, #c0392b 100%)'
    };
    
    document.body.style.setProperty('--custom-background', gradients[gradientId]);
    document.body.classList.add('custom-bg');
  }

  function applyColorBackground(colorId) {
    const colors = {
      color1: '#0a0a0a',
      color2: '#1a1a1a',
      color3: '#2a2a2a',
      color4: '#1e1e1e',
      color5: '#252525',
      color6: '#333333'
    };
    
    document.body.style.setProperty('--custom-background', colors[colorId]);
    document.body.classList.add('custom-bg');
  }

  function applyImageBackground(imageData) {
    document.body.style.setProperty('--custom-background-image', `url(${imageData})`);
    document.body.classList.add('custom-bg-img');
  }

  function openBackgroundModal() {
    elements.bgModal.classList.add('active');
    
    // Сбросить выбор
    elements.bgOptions.forEach(opt => opt.classList.remove('selected'));
    
    // Показать текущий выбор если есть
    if (state.background.type === 'gradient' || state.background.type === 'color') {
      const selected = document.querySelector(`[data-bg="${state.background.value}"]`);
      if (selected) selected.classList.add('selected');
    }
    
    // Сбросить загрузку файла
    elements.bgUpload.value = '';
  }

  function handleBackgroundSelection(e) {
    const bgOption = e.target.closest('.bg-option');
    if (!bgOption) return;
    
    // Сбросить предыдущий выбор
    elements.bgOptions.forEach(opt => opt.classList.remove('selected'));
    
    // Выбрать новый
    bgOption.classList.add('selected');
    
    const bgType = bgOption.dataset.bg.startsWith('gradient') ? 'gradient' : 'color';
    state.background.type = bgType;
    state.background.value = bgOption.dataset.bg;
    state.background.customImage = null;
    
    applyBackground();
  }

  function handleImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      alert('Пожалуйста, выберите файл изображения');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
      state.background.type = 'image';
      state.background.value = 'custom';
      state.background.customImage = e.target.result;
      
      applyImageBackground(e.target.result);
    };
    reader.readAsDataURL(file);
  }

  function previewBackground() {
    if (elements.bgUpload.files[0]) {
      handleImageUpload({ target: { files: [elements.bgUpload.files[0]] } });
    }
  }

  function resetBackground() {
    // Вернуть стандартный градиент
    state.background.type = 'gradient';
    state.background.value = 'gradient1';
    state.background.customImage = null;
    
    applyGradientBackground('gradient1');
    elements.bgUpload.value = '';
    elements.bgOptions.forEach(opt => opt.classList.remove('selected'));
    
    // Выбрать стандартный градиент
    const defaultBg = document.querySelector('[data-bg="gradient1"]');
    if (defaultBg) defaultBg.classList.add('selected');
  }

  function saveBackground() {
    saveStateDebounced();
    elements.bgModal.classList.remove('active');
  }

  function cancelBackground() {
    // Восстановить предыдущие настройки
    applyBackground();
    elements.bgModal.classList.remove('active');
  }

  // Функции для горячих клавиш
  function openHotkeysModal() {
    elements.hotkeysModal.classList.add('active');
  }

  function closeHotkeysModal() {
    elements.hotkeysModal.classList.remove('active');
  }

  function setupHotkeysCopy() {
    elements.hotkeysModal.addEventListener('click', (e) => {
      const hotkeyCode = e.target.closest('.hotkey-code');
      if (hotkeyCode) {
        const textToCopy = hotkeyCode.textContent;
        navigator.clipboard.writeText(textToCopy).then(() => {
          // Визуальная обратная связь
          const originalText = hotkeyCode.textContent;
          hotkeyCode.textContent = '✓ Скопировано!';
          hotkeyCode.style.color = '#2ecc71';
          
          setTimeout(() => {
            hotkeyCode.textContent = originalText;
            hotkeyCode.style.color = 'var(--accent)';
          }, 2000);
        }).catch(err => {
          console.error('Ошибка копирования:', err);
        });
      }
    });
  }

  // Функция переключения темы
  function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    elements.themeToggle.textContent = newTheme === 'dark' ? '🌙' : '☀️';
    localStorage.setItem('gedjifero_theme', newTheme);
  }

  // Горячие клавиши
  function setupHotkeys() {
    document.addEventListener('keydown', (e) => {
      // Alt+P - пауза/продолжение
      if (e.altKey && e.key === 'p') {
        e.preventDefault();
        if (state.shiftActive) {
          if (state.shiftPaused) {
            endPause();
          } else {
            pauseShift();
          }
        }
      }
      
      // Alt+Q - завершение смены
      if (e.altKey && e.key === 'q') {
        e.preventDefault();
        if (state.shiftActive) {
          showEndShiftConfirmation();
        }
      }
      
      // Alt+C - переключение канала
      if (e.altKey && e.key === 'c') {
        e.preventDefault();
        toggleChannel();
      }
      
      // Alt+H - открыть горячие клавиши
      if (e.altKey && e.key === 'h') {
        e.preventDefault();
        openHotkeysModal();
      }
      
      // Цифры 1-9 для быстрого выбора проектов
      if (e.key >= '1' && e.key <= '9' && state.shiftActive && !state.shiftPaused) {
        const index = parseInt(e.key) - 1;
        if (index < state.projects.length) {
          const project = state.projects[index];
          const btn = document.querySelector(`[data-project="${project.name}"]`);
          if (btn && !btn.disabled) {
            btn.click();
          }
        }
      }
    });
  }

  // Уведомления
  function showNotification(title, options = {}) {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, options);
    }
  }

  function requestNotificationPermission() {
    if ('Notification' in window) {
      Notification.requestPermission();
    }
  }

  function init() {
    loadState();
    
    // Загрузка темы
    const savedTheme = localStorage.getItem('gedjifero_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    elements.themeToggle.textContent = savedTheme === 'dark' ? '🌙' : '☀️';
    
    // Обработчики событий
    elements.loginButton.addEventListener('click', handleLogin);
    elements.startShiftBtn.addEventListener('click', startShift);
    elements.endShiftBtn.addEventListener('click', showEndShiftConfirmation);
    elements.pauseShiftBtn.addEventListener('click', pauseShift);
    elements.endPauseBtn.addEventListener('click', endPause);
    elements.channelToggleBtn.addEventListener('click', toggleChannel);
    elements.closeReportBtn.addEventListener('click', closeReport);
    elements.exportPdfBtn.addEventListener('click', exportToPDF);
    elements.exportCsvBtn.addEventListener('click', exportToCSV);
    elements.saveCallsBtn.addEventListener('click', saveEditedCalls);
    elements.cancelEditCallsBtn.addEventListener('click', () => { 
      elements.editCallsModal.classList.remove('active'); 
      state.editingProject = null; 
    });
    elements.confirmChannelChange.addEventListener('click', confirmChannelChange);
    elements.cancelChannelChange.addEventListener('click', cancelChannelChange);
    elements.confirmEndShift.addEventListener('click', confirmEndShift);
    elements.cancelEndShift.addEventListener('click', cancelEndShift);
    elements.editProjectsBtn.addEventListener('click', openEditProjectsModal);
    elements.addProjectBtn.addEventListener('click', addNewProject);
    elements.saveProjectsBtn.addEventListener('click', saveProjects);
    elements.cancelEditBtn.addEventListener('click', () => { 
      elements.editProjectsModal.classList.remove('active'); 
    });
    
    // Обработчики для фона
    elements.bgSettingsBtn.addEventListener('click', openBackgroundModal);
    elements.bgOptions.forEach(opt => {
      opt.addEventListener('click', handleBackgroundSelection);
    });
    elements.bgUpload.addEventListener('change', handleImageUpload);
    elements.previewBgBtn.addEventListener('click', previewBackground);
    elements.resetBgBtn.addEventListener('click', resetBackground);
    elements.saveBgBtn.addEventListener('click', saveBackground);
    elements.cancelBgBtn.addEventListener('click', cancelBackground);
    
    // Обработчики для горячих клавиш
    elements.hotkeysToggle.addEventListener('click', openHotkeysModal);
    elements.closeHotkeys.addEventListener('click', closeHotkeysModal);
    setupHotkeysCopy();
    
    // Обработчик темы
    elements.themeToggle.addEventListener('click', toggleTheme);
    
    // Обработчик кликов по проектам
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
            saveStateDebounced();
          } else {
            state.projects.forEach(p => p.status = 'inactive');
            project.status = 'active';
            state.currentCall = name;
            state.callStartTime = Date.now();
            state.callElapsed = 0;
            saveStateDebounced();
          }
          renderProjects();
          updateStatusIndicator();
        }
      }
      
      const editBtn = e.target.closest('.edit-calls-btn');
      if (editBtn) openEditCallsModal(editBtn.dataset.project);
    });

    // Обработчик удаления проектов в режиме редактирования
    elements.projectsEditContainer.addEventListener('click', e => {
      const deleteBtn = e.target.closest('.delete-project-btn');
      if (deleteBtn) {
        const index = parseInt(deleteBtn.dataset.index);
        deleteProject(index);
      }
    });

    // Восстановление состояния при загрузке
    if (state.operator) {
      elements.operatorName.textContent = state.operator;
      elements.loginModal.classList.remove('active');
      elements.app.style.display = 'block';
      elements.startShiftBtn.disabled = state.shiftActive;
      updateChannelButton();
      
      if (state.shiftActive) {
        if (state.shiftPaused) {
          elements.pauseModal.classList.add('active');
          updateStatusIndicator();
        } else {
          startMainTimer();
        }
      }
      
      renderProjects();
      updateStatusIndicator();
    }

    // Закрытие модальных окон по клику вне области
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('modal')) {
        e.target.classList.remove('active');
      }
    });

    // Enter для входа
    elements.operatorInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') handleLogin();
    });

    // Настройка горячих клавиш и уведомлений
    setupHotkeys();
    requestNotificationPermission();
  }

  // Глобальные функции
  window.updateProjectName = updateProjectName;

  init();
});
