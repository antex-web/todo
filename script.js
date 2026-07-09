// ============================================================
// DATE HELPER FUNCTIONS
// ============================================================

function getTodayDate() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function formatDateLocal(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// ============================================================
// STATE
// ============================================================
let tasks = [];
let trash = [];
let currentFilter = 'all';
let currentCategoryFilter = 'all';
let currentDate = new Date();
let selectedDate = new Date();

// ============================================================
// DOM ELEMENTS
// ============================================================
const taskInput = document.getElementById('taskInput');
const categorySelect = document.getElementById('categorySelect');
const addTaskBtn = document.getElementById('addTaskBtn');
const taskList = document.getElementById('taskList');
const taskCount = document.getElementById('taskCount');
const clearCompletedBtn = document.getElementById('clearCompletedBtn');
const filterBtns = document.querySelectorAll('.filter-btn');
const catFilterBtns = document.querySelectorAll('.cat-filter-btn');

// ============================================================
// LOAD & SAVE
// ============================================================
function loadTasks() {
    const storedTasks = localStorage.getItem('tasks');
    const storedTrash = localStorage.getItem('trash');
    const today = getTodayDate();
    
    if (storedTasks) {
        tasks = JSON.parse(storedTasks);
    } else {
        tasks = [
            { id: Date.now() + 1, text: 'Example Task 1', completed: false, category: 'personal', date: today },
            { id: Date.now() + 2, text: 'Example Task 2', completed: false, category: 'work', date: today },
            { id: Date.now() + 3, text: 'Example Task 3', completed: false, category: 'shopping', date: today },
        ];
    }
    
    if (storedTrash) {
        trash = JSON.parse(storedTrash);
    } else {
        trash = [];
    }
    
    renderTasks();
    updateStatsPage();
    renderCalendar();
    renderCategories();
    renderTrash();
    updateTrashBadge();
    setDefaultDate();
}

function saveTasks() {
    localStorage.setItem('tasks', JSON.stringify(tasks));
    localStorage.setItem('trash', JSON.stringify(trash));
}

// ============================================================
// SET DEFAULT DATE
// ============================================================
function setDefaultDate() {
    const dateInput = document.getElementById('taskDateInput');
    if (dateInput) {
        dateInput.value = '';
    }
}

// ============================================================
// RENDER TASKS
// ============================================================
function renderTasks() {
    let filteredTasks = tasks;

    if (currentFilter === 'pending') {
        filteredTasks = filteredTasks.filter(task => !task.completed);
    } else if (currentFilter === 'completed') {
        filteredTasks = filteredTasks.filter(task => task.completed);
    }

    if (currentCategoryFilter !== 'all') {
        filteredTasks = filteredTasks.filter(task => task.category === currentCategoryFilter);
    }

    taskList.innerHTML = '';

    if (filteredTasks.length === 0) {
        taskList.innerHTML = `
            <div style="text-align: center; padding: 40px 0; color: rgba(255,255,255,0.3);">
                <i class="fas fa-inbox" style="font-size: 2rem; margin-bottom: 10px; display: block;"></i>
                <p>No tasks here</p>
                <p style="font-size: 0.8rem;">Add a new task to get started</p>
            </div>
        `;
    } else {
        const totalTasks = filteredTasks.length;
        
        filteredTasks.forEach((task, index) => {
            const li = document.createElement('li');
            li.className = `todo-item${task.completed ? ' completed' : ''}`;
            li.dataset.id = task.id;

            const categoryEmojis = { personal: '👤', work: '💼', shopping: '🛒', health: '💪', other: '📌' };
            const categoryLabels = { personal: 'Personal', work: 'Work', shopping: 'Shopping', health: 'Health', other: 'Other' };

            let displayDate = task.date || '';
            if (displayDate) {
                const parts = displayDate.split('-');
                if (parts.length === 3) {
                    displayDate = `${parts[1]}/${parts[2]}/${parts[0]}`;
                }
            }

            const taskNumber = totalTasks - index;

            li.innerHTML = `
                <span class="task-number">#${taskNumber}</span>
                <div class="task-checkbox ${task.completed ? 'checked' : ''}"></div>
                <span class="task-text">${escapeHTML(task.text)}</span>
                <span class="task-category">${categoryEmojis[task.category] || '📌'} ${categoryLabels[task.category] || 'Other'}</span>
                <span style="font-size:0.65rem;color:rgba(255,255,255,0.3);">${displayDate}</span>
                <button class="task-delete" title="Move to trash" aria-label="Delete task">
                    <i class="fas fa-trash-alt"></i>
                </button>
            `;

            const checkbox = li.querySelector('.task-checkbox');
            checkbox.addEventListener('click', () => toggleTask(task.id));

            const deleteBtn = li.querySelector('.task-delete');
            deleteBtn.addEventListener('click', () => moveToTrash(task.id));

            taskList.appendChild(li);
        });
    }

    updateStats();
    updateFilterButtons();
    saveTasks();
    updateStatsPage();
    renderCalendar();
    renderCategories();
    renderTrash();
    updateTrashBadge();
}

function escapeHTML(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ============================================================
// TRASH FUNCTIONS
// ============================================================
function moveToTrash(taskId) {
    const taskIndex = tasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) return;
    
    const task = tasks[taskIndex];
    const taskName = task.text;
    
    if (confirm(`Move "${taskName}" to trash?`)) {
        // Remove from tasks
        tasks.splice(taskIndex, 1);
        
        // Add to trash with deletion date
        trash.push({
            ...task,
            deletedAt: new Date().toISOString()
        });
        
        saveTasks();
        renderTasks();
        renderTrash();
        updateTrashBadge();
    }
}

function restoreFromTrash(taskId) {
    const taskIndex = trash.findIndex(t => t.id === taskId);
    if (taskIndex === -1) return;
    
    const task = trash[taskIndex];
    delete task.deletedAt; // Remove deletion date
    
    // Add back to tasks
    tasks.unshift(task);
    
    // Remove from trash
    trash.splice(taskIndex, 1);
    
    saveTasks();
    renderTasks();
    renderTrash();
    updateTrashBadge();
}

function permanentDelete(taskId) {
    const task = trash.find(t => t.id === taskId);
    if (!task) return;
    
    if (confirm(`Permanently delete "${task.text}"? This cannot be undone.`)) {
        trash = trash.filter(t => t.id !== taskId);
        saveTasks();
        renderTrash();
        updateTrashBadge();
    }
}

function emptyTrash() {
    if (trash.length === 0) return;
    
    if (confirm(`Delete ${trash.length} items permanently? This cannot be undone.`)) {
        trash = [];
        saveTasks();
        renderTrash();
        updateTrashBadge();
    }
}

function renderTrash() {
    const container = document.getElementById('trashList');
    const countSpan = document.getElementById('trashCount');
    
    if (!container) return;
    
    countSpan.textContent = `${trash.length} tasks in trash`;
    
    if (trash.length === 0) {
        container.innerHTML = `
            <div class="trash-empty">
                <i class="fas fa-trash-alt"></i>
                <p>Trash is empty</p>
                <p style="font-size: 0.8rem;">Deleted tasks will appear here</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = '';
    trash.forEach(task => {
        const li = document.createElement('li');
        li.className = 'trash-item';
        
        let displayDate = task.date || '';
        if (displayDate) {
            const parts = displayDate.split('-');
            if (parts.length === 3) {
                displayDate = `${parts[1]}/${parts[2]}/${parts[0]}`;
            }
        }
        
        // Format deletion date
        let deletedDate = 'Recently';
        if (task.deletedAt) {
            const d = new Date(task.deletedAt);
            deletedDate = d.toLocaleDateString();
        }
        
        li.innerHTML = `
            <span class="trash-icon"><i class="fas fa-trash-alt"></i></span>
            <span class="trash-text">${escapeHTML(task.text)}</span>
            <span class="trash-date">Deleted: ${deletedDate}</span>
            <div class="trash-actions">
                <button class="restore-btn" data-id="${task.id}">
                    <i class="fas fa-undo"></i> Restore
                </button>
                <button class="delete-permanent-btn" data-id="${task.id}">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        
        container.appendChild(li);
        
        // Add event listeners
        const restoreBtn = li.querySelector('.restore-btn');
        restoreBtn.addEventListener('click', () => restoreFromTrash(task.id));
        
        const deleteBtn = li.querySelector('.delete-permanent-btn');
        deleteBtn.addEventListener('click', () => permanentDelete(task.id));
    });
}

function updateTrashBadge() {
    const badge = document.getElementById('trashBadge');
    if (!badge) return;
    
    const count = trash.length;
    badge.textContent = count;
    
    if (count === 0) {
        badge.classList.add('empty');
    } else {
        badge.classList.remove('empty');
    }
}

// ============================================================
// TASK CRUD
// ============================================================
function addTask() {
    const text = taskInput.value.trim();
    if (!text) {
        taskInput.style.borderColor = '#ef4444';
        taskInput.placeholder = '⚠️ Please enter a task';
        setTimeout(() => {
            taskInput.style.borderColor = 'rgba(255,255,255,0.1)';
            taskInput.placeholder = 'Add a new task...';
        }, 1500);
        return;
    }

    const category = categorySelect.value;
    const taskDateInput = document.getElementById('taskDateInput');
    let taskDate = taskDateInput.value;
    
    if (!taskDate) {
        taskDate = getTodayDate();
    }

    const newTask = {
        id: Date.now(),
        text: text,
        completed: false,
        category: category,
        date: taskDate,
        createdAt: new Date().toISOString()
    };

    tasks.unshift(newTask);
    taskInput.value = '';
    setDefaultDate();
    
    renderTasks();
}

function toggleTask(id) {
    tasks = tasks.map(task => {
        if (task.id === id) {
            return { ...task, completed: !task.completed };
        }
        return task;
    });
    renderTasks();
}

function clearCompleted() {
    const completedTasks = tasks.filter(t => t.completed);
    if (completedTasks.length === 0) return;
    if (confirm(`Move ${completedTasks.length} completed tasks to trash?`)) {
        completedTasks.forEach(task => {
            moveToTrash(task.id);
        });
    }
}

// ============================================================
// FILTERS
// ============================================================
filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        currentFilter = btn.dataset.filter;
        renderTasks();
    });
});

catFilterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        catFilterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentCategoryFilter = btn.dataset.cat;
        renderTasks();
    });
});

function updateFilterButtons() {
    filterBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.filter === currentFilter);
    });
}

// ============================================================
// STATS
// ============================================================
function updateStats() {
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    const pending = total - completed;
    taskCount.textContent = `${total} tasks (${pending} pending, ${completed} completed)`;
}

function updateStatsPage() {
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    const pending = total - completed;
    const rate = total === 0 ? 0 : Math.round((completed / total) * 100);

    document.getElementById('statTotal').textContent = total;
    document.getElementById('statPending').textContent = pending;
    document.getElementById('statCompleted').textContent = completed;
    document.getElementById('statRate').textContent = rate + '%';

    document.getElementById('progressBar').style.width = rate + '%';
    document.getElementById('progressText').textContent = rate + '%';

    const motivation = document.getElementById('motivationMessage');
    if (total === 0) {
        motivation.innerHTML = `<i class="fas fa-smile"></i><p>Start adding tasks to track your progress!</p>`;
    } else if (rate === 100) {
        motivation.innerHTML = `<i class="fas fa-trophy"></i><p>🎉 Amazing! You've completed all your tasks!</p>`;
    } else if (rate >= 70) {
        motivation.innerHTML = `<i class="fas fa-star"></i><p>🌟 Great progress! You're doing awesome!</p>`;
    } else if (rate >= 40) {
        motivation.innerHTML = `<i class="fas fa-arrow-up"></i><p>💪 Keep going! You're making good progress!</p>`;
    } else if (rate >= 10) {
        motivation.innerHTML = `<i class="fas fa-rocket"></i><p>🚀 You've started! Keep pushing forward!</p>`;
    } else {
        motivation.innerHTML = `<i class="fas fa-hourglass-start"></i><p>⏳ You have tasks pending. Time to get started!</p>`;
    }

    renderCategoryBreakdown();
}

function renderCategoryBreakdown() {
    const container = document.getElementById('categoryBreakdown');
    const categories = {};
    tasks.forEach(task => {
        const cat = task.category || 'other';
        categories[cat] = (categories[cat] || 0) + 1;
    });

    const emojis = { personal: '👤', work: '💼', shopping: '🛒', health: '💪', other: '📌' };
    const labels = { personal: 'Personal', work: 'Work', shopping: 'Shopping', health: 'Health', other: 'Other' };

    let html = '';
    for (const [cat, count] of Object.entries(categories)) {
        html += `
            <div class="category-stat-item">
                <span>${emojis[cat] || '📌'} ${labels[cat] || cat}</span>
                <span>${count} tasks</span>
            </div>
        `;
    }
    container.innerHTML = html || '<p style="color:rgba(255,255,255,0.3);font-size:0.85rem;">No tasks yet</p>';
}

// ============================================================
// CALENDAR
// ============================================================
function renderCalendar() {
    const grid = document.getElementById('calendarGrid');
    const monthYear = document.getElementById('currentMonthYear');
    
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                        'July', 'August', 'September', 'October', 'November', 'December'];
    monthYear.textContent = `${monthNames[month]} ${year}`;
    
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();
    
    let html = '';
    
    ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].forEach(day => {
        html += `<div class="day-name">${day}</div>`;
    });
    
    for (let i = 0; i < firstDay; i++) {
        html += `<div class="day other-month"></div>`;
    }
    
    for (let day = 1; day <= daysInMonth; day++) {
        const dateObj = new Date(year, month, day);
        const dateStr = formatDateLocal(dateObj);
        
        const hasTask = tasks.some(t => t.date === dateStr);
        
        const isToday = dateObj.getFullYear() === today.getFullYear() &&
                        dateObj.getMonth() === today.getMonth() &&
                        dateObj.getDate() === today.getDate();
        
        const selectedStr = formatDateLocal(selectedDate);
        const isSelected = dateStr === selectedStr;
        
        html += `
            <div class="day ${hasTask ? 'has-task' : ''} ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}" 
                 data-date="${dateStr}">
                ${day}
            </div>
        `;
    }
    
    grid.innerHTML = html;
    
    grid.querySelectorAll('.day:not(.other-month)').forEach(day => {
        day.addEventListener('click', function() {
            const dateStr = this.dataset.date;
            if (dateStr) {
                const parts = dateStr.split('-');
                selectedDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
                
                renderCalendar();
                showTasksForDate(dateStr);
            }
        });
    });
    
    const selectedStr = formatDateLocal(selectedDate);
    showTasksForDate(selectedStr);
}

function showTasksForDate(dateStr) {
    const list = document.getElementById('calendarTaskList');
    const dayTasks = tasks.filter(t => t.date === dateStr);
    
    if (dayTasks.length === 0) {
        list.innerHTML = `<li style="color:rgba(255,255,255,0.3);">No tasks for this day</li>`;
        return;
    }
    
    const emojis = { personal: '👤', work: '💼', shopping: '🛒', health: '💪', other: '📌' };
    const labels = { personal: 'Personal', work: 'Work', shopping: 'Shopping', health: 'Health', other: 'Other' };
    
    list.innerHTML = dayTasks.map((task, index) => `
        <li>
            #${index + 1} ${task.completed ? '✅' : '☐'} ${escapeHTML(task.text)}
            <span class="cat-badge">${emojis[task.category] || '📌'} ${labels[task.category] || 'Other'}</span>
        </li>
    `).join('');
}

document.getElementById('prevMonthBtn')?.addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    renderCalendar();
});

document.getElementById('nextMonthBtn')?.addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    renderCalendar();
});

document.getElementById('todayBtn')?.addEventListener('click', () => {
    const today = new Date();
    currentDate = new Date(today.getFullYear(), today.getMonth(), 1);
    selectedDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    renderCalendar();
    showTasksForDate(formatDateLocal(today));
});

// ============================================================
// CATEGORIES
// ============================================================
function renderCategories() {
    const grid = document.getElementById('categoriesGrid');
    const categories = {};
    tasks.forEach(task => {
        const cat = task.category || 'other';
        categories[cat] = (categories[cat] || 0) + 1;
    });
    
    const emojis = { personal: '👤', work: '💼', shopping: '🛒', health: '💪', other: '📌' };
    const labels = { personal: 'Personal', work: 'Work', shopping: 'Shopping', health: 'Health', other: 'Other' };
    
    let html = '';
    for (const [cat, count] of Object.entries(categories)) {
        html += `
            <div class="category-card">
                <span class="cat-emoji">${emojis[cat] || '📌'}</span>
                <div class="cat-name">${labels[cat] || cat}</div>
                <div class="cat-count">${count} tasks</div>
            </div>
        `;
    }
    
    grid.innerHTML = html || '<p style="color:rgba(255,255,255,0.3);text-align:center;padding:20px 0;">No categories yet</p>';
}

document.getElementById('addCategoryBtn')?.addEventListener('click', () => {
    const input = document.getElementById('newCategoryInput');
    const name = input.value.trim().toLowerCase();
    if (!name) return;
    
    const select = categorySelect;
    const option = document.createElement('option');
    option.value = name;
    option.textContent = name.charAt(0).toUpperCase() + name.slice(1);
    select.appendChild(option);
    
    input.value = '';
    renderCategories();
});

// ============================================================
// SETTINGS
// ============================================================
document.getElementById('darkModeToggle')?.addEventListener('change', function() {
    document.body.classList.toggle('dark-mode', this.checked);
    localStorage.setItem('darkMode', this.checked);
});

if (localStorage.getItem('darkMode') === 'true') {
    document.body.classList.add('dark-mode');
    const toggle = document.getElementById('darkModeToggle');
    if (toggle) toggle.checked = true;
}

document.getElementById('clearAllDataBtn')?.addEventListener('click', () => {
    if (confirm('⚠️ Delete ALL tasks and trash permanently?')) {
        localStorage.removeItem('tasks');
        localStorage.removeItem('trash');
        tasks = [];
        trash = [];
        renderTasks();
        updateStatsPage();
        renderCalendar();
        renderCategories();
        renderTrash();
        updateTrashBadge();
    }
});

// ============================================================
// EMPTY TRASH
// ============================================================
document.getElementById('emptyTrashBtn')?.addEventListener('click', emptyTrash);

// ============================================================
// KEYBOARD SHORTCUTS
// ============================================================
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'T') {
        e.preventDefault();
        taskInput.focus();
        taskInput.select();
    }
});

// ============================================================
// PAGE NAVIGATION
// ============================================================
const navTabs = document.querySelectorAll('.nav-tab');
const pages = {
    tasks: document.getElementById('page-tasks'),
    calendar: document.getElementById('page-calendar'),
    categories: document.getElementById('page-categories'),
    stats: document.getElementById('page-stats'),
    settings: document.getElementById('page-settings'),
    trash: document.getElementById('page-trash'),
};

navTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        navTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        Object.values(pages).forEach(page => {
            if (page) page.classList.remove('active');
        });
        
        const pageId = tab.dataset.page;
        if (pages[pageId]) {
            pages[pageId].classList.add('active');
        }
        
        if (pageId === 'stats') updateStatsPage();
        if (pageId === 'calendar') renderCalendar();
        if (pageId === 'categories') renderCategories();
        if (pageId === 'trash') renderTrash();
    });
});

// ============================================================
// EVENT LISTENERS
// ============================================================
addTaskBtn.addEventListener('click', addTask);
taskInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') addTask(); });
clearCompletedBtn.addEventListener('click', clearCompleted);

// ============================================================
// INITIALIZE
// ============================================================
loadTasks();
console.log('✅ TaskFlow loaded successfully with Recycle Bin!');
console.log('💡 Keyboard shortcuts: Ctrl+Shift+T = Focus input');
console.log('🗑️ Deleted tasks go to Trash - you can restore them!');