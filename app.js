// Data Management
class DataManager {
    constructor() {
        this.tasks = this.loadData('tasks') || [];
        this.subjects = this.loadData('subjects') || this.getDefaultSubjects();
        this.notes = this.loadData('notes') || [];
        this.documents = this.loadData('documents') || [];
        this.chatHistory = this.loadData('chatHistory') || [];
        this.dailyStats = this.loadData('dailyStats') || {};
        this.settings = this.loadData('settings') || this.getDefaultSettings();
        this.currentTaskId = null;
        this.currentSubjectId = null;
        this.currentNoteId = null;
    }

    loadData(key) {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    }

    saveData(key, data) {
        localStorage.setItem(key, JSON.stringify(data));
    }

    getDefaultSubjects() {
        return [
            { id: 1, name: 'Mathematics', priority: 'high' },
            { id: 2, name: 'Physics', priority: 'medium' },
            { id: 3, name: 'Chemistry', priority: 'medium' },
            { id: 4, name: 'Biology', priority: 'low' }
        ];
    }

    getDefaultSettings() {
        return {
            theme: 'light',
            dailyGoalHours: 4,
            dailyReminders: true,
            revisionAlerts: true,
            testAlerts: true
        };
    }

    // Tasks
    addTask(task) {
        task.id = Date.now();
        task.completed = false;
        task.createdAt = new Date().toISOString();
        this.tasks.push(task);
        this.saveData('tasks', this.tasks);
        return task;
    }

    updateTask(id, updates) {
        const index = this.tasks.findIndex(t => t.id === id);
        if (index !== -1) {
            this.tasks[index] = { ...this.tasks[index], ...updates };
            this.saveData('tasks', this.tasks);
            return this.tasks[index];
        }
        return null;
    }

    deleteTask(id) {
        this.tasks = this.tasks.filter(t => t.id !== id);
        this.saveData('tasks', this.tasks);
    }

    toggleTask(id) {
        const task = this.tasks.find(t => t.id === id);
        if (task) {
            task.completed = !task.completed;
            task.completedAt = task.completed ? new Date().toISOString() : null;
            this.saveData('tasks', this.tasks);
            this.updateDailyStats();
            return task;
        }
        return null;
    }

    getTasks(filter = {}) {
        let filtered = this.tasks;

        if (filter.date) {
            filtered = filtered.filter(t => t.date === filter.date);
        }

        if (filter.category && filter.category !== 'all') {
            filtered = filtered.filter(t => t.category === filter.category);
        }

        if (filter.subjectId) {
            filtered = filtered.filter(t => t.subjectId === filter.subjectId);
        }

        return filtered;
    }

    // Subjects
    addSubject(subject) {
        subject.id = Date.now();
        subject.createdAt = new Date().toISOString();
        this.subjects.push(subject);
        this.saveData('subjects', this.subjects);
        return subject;
    }

    updateSubject(id, updates) {
        const index = this.subjects.findIndex(s => s.id === id);
        if (index !== -1) {
            this.subjects[index] = { ...this.subjects[index], ...updates };
            this.saveData('subjects', this.subjects);
            return this.subjects[index];
        }
        return null;
    }

    deleteSubject(id) {
        this.subjects = this.subjects.filter(s => s.id !== id);
        this.saveData('subjects', this.subjects);
    }

    getSubjectStats(subjectId) {
        const subjectTasks = this.tasks.filter(t => t.subjectId === subjectId);
        const completedTasks = subjectTasks.filter(t => t.completed);
        
        return {
            totalTasks: subjectTasks.length,
            completedTasks: completedTasks.length,
            completionRate: subjectTasks.length > 0 
                ? Math.round((completedTasks.length / subjectTasks.length) * 100) 
                : 0,
            totalMinutes: completedTasks.reduce((sum, t) => sum + (parseInt(t.duration) || 0), 0)
        };
    }

    // Notes
    addNote(note) {
        note.id = Date.now();
        note.createdAt = new Date().toISOString();
        this.notes.push(note);
        this.saveData('notes', this.notes);
        return note;
    }

    deleteNote(id) {
        this.notes = this.notes.filter(n => n.id !== id);
        this.saveData('notes', this.notes);
    }

    // Documents
    addDocument(document) {
        document.id = Date.now();
        document.uploadedAt = new Date().toISOString();
        this.documents.push(document);
        this.saveData('documents', this.documents);
        return document;
    }

    deleteDocument(id) {
        this.documents = this.documents.filter(d => d.id !== id);
        this.saveData('documents', this.documents);
    }

    // Chat History
    addChatMessage(message) {
        this.chatHistory.push(message);
        this.saveData('chatHistory', this.chatHistory);
    }

    // Daily Stats
    updateDailyStats() {
        const today = new Date().toISOString().split('T')[0];
        const todayTasks = this.getTasks({ date: today });
        
        this.dailyStats[today] = {
            totalTasks: todayTasks.length,
            completedTasks: todayTasks.filter(t => t.completed).length,
            studyMinutes: todayTasks
                .filter(t => t.completed)
                .reduce((sum, t) => sum + (parseInt(t.duration) || 0), 0),
            categories: this.getCategoryStats(todayTasks.filter(t => t.completed))
        };

        this.saveData('dailyStats', this.dailyStats);
    }

    getCategoryStats(tasks) {
        const stats = {};
        tasks.forEach(task => {
            if (!stats[task.category]) {
                stats[task.category] = 0;
            }
            stats[task.category] += parseInt(task.duration) || 0;
        });
        return stats;
    }

    getStreak() {
        const dates = Object.keys(this.dailyStats).sort().reverse();
        let streak = 0;
        const today = new Date().toISOString().split('T')[0];
        
        for (let i = 0; i < dates.length; i++) {
            const date = dates[i];
            const dayDiff = this.getDayDifference(today, date);
            
            if (dayDiff === i && this.dailyStats[date].completedTasks > 0) {
                streak++;
            } else {
                break;
            }
        }
        
        return streak;
    }

    getDayDifference(date1, date2) {
        const d1 = new Date(date1);
        const d2 = new Date(date2);
        const diffTime = Math.abs(d1 - d2);
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    // Reports
    getWeeklyReport() {
        const today = new Date();
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        return this.getReportForRange(weekAgo, today);
    }

    getMonthlyReport() {
        const today = new Date();
        const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
        return this.getReportForRange(monthAgo, today);
    }

    getYearlyReport() {
        const today = new Date();
        const yearAgo = new Date(today.getTime() - 365 * 24 * 60 * 60 * 1000);
        return this.getReportForRange(yearAgo, today);
    }

    getReportForRange(startDate, endDate) {
        const start = startDate.toISOString().split('T')[0];
        const end = endDate.toISOString().split('T')[0];
        
        const relevantDates = Object.keys(this.dailyStats).filter(date => date >= start && date <= end);
        
        let totalStudyMinutes = 0;
        let totalCompleted = 0;
        let totalTasks = 0;
        const subjectStats = {};
        const categoryStats = {};

        relevantDates.forEach(date => {
            const stats = this.dailyStats[date];
            totalStudyMinutes += stats.studyMinutes || 0;
            totalCompleted += stats.completedTasks || 0;
            totalTasks += stats.totalTasks || 0;

            Object.entries(stats.categories || {}).forEach(([category, minutes]) => {
                categoryStats[category] = (categoryStats[category] || 0) + minutes;
            });
        });

        const tasks = this.tasks.filter(t => t.date >= start && t.date <= end && t.completed);
        tasks.forEach(task => {
            const subject = this.subjects.find(s => s.id === task.subjectId);
            if (subject) {
                const subjectName = subject.name;
                subjectStats[subjectName] = (subjectStats[subjectName] || 0) + (parseInt(task.duration) || 0);
            }
        });

        return {
            totalStudyHours: Math.floor(totalStudyMinutes / 60),
            totalStudyMinutes: totalStudyMinutes % 60,
            totalCompleted,
            totalTasks,
            completionRate: totalTasks > 0 ? Math.round((totalCompleted / totalTasks) * 100) : 0,
            subjectStats,
            categoryStats,
            daysActive: relevantDates.filter(date => this.dailyStats[date].completedTasks > 0).length
        };
    }

    // Data Export/Import
    exportData() {
        const data = {
            tasks: this.tasks,
            subjects: this.subjects,
            notes: this.notes,
            documents: this.documents,
            chatHistory: this.chatHistory,
            dailyStats: this.dailyStats,
            settings: this.settings,
            exportDate: new Date().toISOString()
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ai-study-planner-backup-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    importData(file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target.result);
                this.tasks = data.tasks || [];
                this.subjects = data.subjects || this.getDefaultSubjects();
                this.notes = data.notes || [];
                this.documents = data.documents || [];
                this.chatHistory = data.chatHistory || [];
                this.dailyStats = data.dailyStats || {};
                this.settings = data.settings || this.getDefaultSettings();
                
                // Save all data
                this.saveData('tasks', this.tasks);
                this.saveData('subjects', this.subjects);
                this.saveData('notes', this.notes);
                this.saveData('documents', this.documents);
                this.saveData('chatHistory', this.chatHistory);
                this.saveData('dailyStats', this.dailyStats);
                this.saveData('settings', this.settings);
                
                location.reload();
            } catch (error) {
                alert('Error importing data. Please check the file format.');
            }
        };
        reader.readAsText(file);
    }

    clearAllData() {
        if (confirm('Are you sure you want to clear all data? This cannot be undone!')) {
            localStorage.clear();
            location.reload();
        }
    }
}

// UI Manager
class UIManager {
    constructor(dataManager) {
        this.dataManager = dataManager;
        this.currentPage = 'dashboard';
        this.currentFilter = 'all';
        this.charts = {};
        this.initializeElements();
        this.attachEventListeners();
        this.loadTheme();
        this.updateUI();
        this.populateSubjectDropdowns();
    }

    initializeElements() {
        this.elements = {
            navItems: document.querySelectorAll('.nav-item'),
            pages: document.querySelectorAll('.page'),
            pageTitle: document.querySelector('.page-title'),
            streakCount: document.getElementById('streakCount'),
            todayStudyHours: document.getElementById('todayStudyHours'),
            todayCompleted: document.getElementById('todayCompleted'),
            todayPending: document.getElementById('todayPending'),
            productivityScore: document.getElementById('productivityScore'),
            dailyGoalValue: document.getElementById('dailyGoalValue'),
            dailyProgressPercent: document.getElementById('dailyProgressPercent'),
            dailyProgressFill: document.getElementById('dailyProgressFill'),
            topTasksList: document.getElementById('topTasksList'),
            allTasksList: document.getElementById('allTasksList'),
            themeToggle: document.getElementById('themeToggle'),
            menuToggle: document.getElementById('menuToggle'),
            taskModal: document.getElementById('taskModal'),
            subjectModal: document.getElementById('subjectModal'),
            noteModal: document.getElementById('noteModal'),
            taskForm: document.getElementById('taskForm'),
            subjectForm: document.getElementById('subjectForm'),
            noteForm: document.getElementById('noteForm'),
            subjectsGrid: document.getElementById('subjectsGrid'),
            notesGrid: document.getElementById('notesGrid'),
            documentsGrid: document.getElementById('documentsGrid'),
            chatHistory: document.getElementById('chatHistory'),
            quickChips: document.getElementById('quickChips'),
            chatInput: document.getElementById('chatInput'),
            appsGrid: document.getElementById('appsGrid'),
            reportContent: document.getElementById('reportContent')
        };
    }

    attachEventListeners() {
        // Navigation - using event delegation
        document.querySelector('.nav-menu').addEventListener('click', (e) => {
            const navItem = e.target.closest('.nav-item');
            if (navItem) {
                this.switchPage(navItem.dataset.page);
            }
        });

        // Sidebar toggle
        document.getElementById('sidebarToggle').addEventListener('click', () => {
            const sidebar = document.querySelector('.sidebar');
            const mainContent = document.querySelector('.main-content');
            sidebar.classList.toggle('collapsed');
            const icon = document.querySelector('#sidebarToggle i');
            if (sidebar.classList.contains('collapsed')) {
                icon.className = 'fas fa-bars';
                mainContent.style.marginLeft = '70px';
            } else {
                icon.className = 'fas fa-times';
                mainContent.style.marginLeft = '260px';
            }
        });

        // Theme toggle
        this.elements.themeToggle.addEventListener('click', () => this.toggleTheme());

        // Menu toggle
        this.elements.menuToggle.addEventListener('click', () => {
            document.querySelector('.sidebar').classList.toggle('active');
        });

        // Add task button
        document.getElementById('addTaskBtn').addEventListener('click', () => this.openTaskModal());

        // Add subject button
        document.getElementById('addSubjectBtn').addEventListener('click', () => this.openSubjectModal());

        // Add note button
        document.getElementById('addNoteBtn').addEventListener('click', () => this.openNoteModal());

        // Upload document button
        document.getElementById('uploadDocumentBtn').addEventListener('click', () => {
            document.getElementById('documentUpload').click();
        });

        // Document upload
        document.getElementById('documentUpload').addEventListener('change', (e) => {
            this.handleDocumentUpload(e.target.files);
        });

        // Generate timetable button
        document.getElementById('generateTimetableBtn').addEventListener('click', () => {
            this.generateTimetable();
        });

        // Modal close buttons
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', () => this.closeModals());
        });

        // Click outside modal to close
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) this.closeModals();
            });
        });

        // Task form
        this.elements.taskForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleTaskSubmit();
        });

        // Subject form
        this.elements.subjectForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSubjectSubmit();
        });

        // Note form
        this.elements.noteForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleNoteSubmit();
        });

        // Filter buttons
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', () => this.setFilter(btn.dataset.filter));
        });

        // Analytics range
        const analyticsRange = document.getElementById('analyticsRange');
        if (analyticsRange) {
            analyticsRange.addEventListener('change', () => this.updateAnalytics());
        }

        // Settings buttons
        const exportBtn = document.getElementById('exportData');
        const importBtn = document.getElementById('importData');
        const clearBtn = document.getElementById('clearData');
        const saveGoalBtn = document.getElementById('saveGoalBtn');
        
        if (exportBtn) exportBtn.addEventListener('click', () => this.dataManager.exportData());
        if (importBtn) importBtn.addEventListener('click', () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            input.onchange = (e) => this.dataManager.importData(e.target.files[0]);
            input.click();
        });
        if (clearBtn) clearBtn.addEventListener('click', () => this.dataManager.clearAllData());
        if (saveGoalBtn) saveGoalBtn.addEventListener('click', () => this.saveDailyGoal());

        // Pomodoro
        this.initializePomodoro();

        // AI Assistant
        this.initializeAIAssistant();

        // Set today's date as default
        const taskDateInput = document.getElementById('taskDate');
        if (taskDateInput) {
            taskDateInput.value = new Date().toISOString().split('T')[0];
        }

        // Initialize timetable
        this.initializeTimetable();
    }

    switchPage(page) {
        this.currentPage = page;
        
        this.elements.navItems.forEach(item => {
            item.classList.toggle('active', item.dataset.page === page);
        });

        this.elements.pages.forEach(p => {
            p.classList.toggle('active', p.id === page);
        });

        const titles = {
            dashboard: 'Dashboard',
            tasks: 'All Tasks',
            subjects: 'Subjects',
            timetable: 'Timetable',
            pomodoro: 'Pomodoro Timer',
            notes: 'Notes',
            documents: 'Documents',
            'ai-assistant': 'AI Assistant',
            apps: 'Study Apps',
            analytics: 'Analytics',
            settings: 'Settings'
        };

        this.elements.pageTitle.textContent = titles[page] || page;

        if (page === 'dashboard') this.updateDashboard();
        if (page === 'tasks') this.renderAllTasks();
        if (page === 'subjects') this.renderSubjects();
        if (page === 'notes') this.renderNotes();
        if (page === 'documents') this.renderDocuments();
        if (page === 'ai-assistant') this.renderChatHistory();
        if (page === 'apps') this.renderApps();
        if (page === 'analytics') this.updateAnalytics();
        if (page === 'settings') this.loadSettings();
    }

    updateUI() {
        this.updateDashboard();
        this.updateStreak();
    }

    updateDashboard() {
        this.updateDashboardStats();
        this.renderTopTasks();
        this.updateDailyProgress();
    }

    updateDashboardStats() {
        const today = new Date().toISOString().split('T')[0];
        const todayTasks = this.dataManager.getTasks({ date: today });
        const completed = todayTasks.filter(t => t.completed);
        const pending = todayTasks.filter(t => !t.completed);

        const totalMinutes = completed.reduce((sum, t) => sum + (parseInt(t.duration) || 0), 0);
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;

        this.elements.todayStudyHours.textContent = `${hours}h ${minutes}m`;
        this.elements.todayCompleted.textContent = completed.length;
        this.elements.todayPending.textContent = pending.length;
        
        const productivity = todayTasks.length > 0 
            ? Math.round((completed.length / todayTasks.length) * 100)
            : 0;
        this.elements.productivityScore.textContent = `${productivity}%`;
    }

    updateDailyProgress() {
        const today = new Date().toISOString().split('T')[0];
        const todayTasks = this.dataManager.getTasks({ date: today });
        const completedTasks = todayTasks.filter(t => t.completed);
        
        const goalHours = this.dataManager.settings.dailyGoalHours || 4;
        const goalMinutes = goalHours * 60;
        const completedMinutes = completedTasks.reduce((sum, t) => sum + (parseInt(t.duration) || 0), 0);
        
        const progressPercent = Math.min(100, Math.round((completedMinutes / goalMinutes) * 100));
        
        this.elements.dailyGoalValue.textContent = `${goalHours} hours`;
        this.elements.dailyProgressPercent.textContent = `${progressPercent}%`;
        this.elements.dailyProgressFill.style.width = `${progressPercent}%`;
    }

    renderTopTasks() {
        const today = new Date().toISOString().split('T')[0];
        let tasks = this.dataManager.getTasks({ date: today });
        
        // Sort by priority and completion status
        tasks.sort((a, b) => {
            // Uncompleted tasks first
            if (a.completed !== b.completed) {
                return a.completed ? 1 : -1;
            }
            
            // High priority first
            const priorityOrder = { high: 3, medium: 2, low: 1 };
            return priorityOrder[b.priority] - priorityOrder[a.priority];
        });
        
        // Take top 5
        tasks = tasks.slice(0, 5);
        
        this.elements.topTasksList.innerHTML = tasks.length === 0
            ? '<p style="text-align: center; color: var(--text-secondary); padding: 2rem;">No tasks for today. Add your first task!</p>'
            : tasks.map(task => this.createTaskHTML(task)).join('');

        this.attachTaskEventListeners();
    }

    renderAllTasks() {
        const tasks = this.dataManager.getTasks({ category: this.currentFilter });
        
        this.elements.allTasksList.innerHTML = tasks.length === 0
            ? '<p style="text-align: center; color: var(--text-secondary); padding: 2rem;">No tasks found.</p>'
            : tasks.map(task => this.createTaskHTML(task)).join('');

        this.attachTaskEventListeners();
    }

    createTaskHTML(task) {
        const categoryIcons = {
            study: '📚',
            reading: '📖',
            notes: '✍',
            revision: '🔁',
            assignment: '📝',
            test: '⏳'
        };

        const subject = this.dataManager.subjects.find(s => s.id === task.subjectId);
        const subjectName = subject ? subject.name : 'Unknown';

        return `
            <div class="task-item ${task.completed ? 'completed' : ''}" data-task-id="${task.id}">
                <div class="task-left">
                    <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''}>
                    <div class="task-info">
                        <div class="task-title">${categoryIcons[task.category] || ''} ${task.title}</div>
                        <div class="task-meta">
                            <span><i class="fas fa-book"></i> ${subjectName}</span>
                            <span><i class="fas fa-clock"></i> ${task.duration} min</span>
                            <span><i class="fas fa-calendar"></i> ${task.date}</span>
                        </div>
                    </div>
                </div>
                <div class="task-actions">
                    <button class="task-action-btn edit-task" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="task-action-btn delete-task" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }

    attachTaskEventListeners() {
        document.querySelectorAll('.task-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const taskId = parseInt(e.target.closest('.task-item').dataset.taskId);
                this.dataManager.toggleTask(taskId);
                this.updateUI();
            });
        });

        document.querySelectorAll('.delete-task').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const taskId = parseInt(e.target.closest('.task-item').dataset.taskId);
                if (confirm('Delete this task?')) {
                    this.dataManager.deleteTask(taskId);
                    this.updateUI();
                    if (this.currentPage === 'tasks') this.renderAllTasks();
                }
            });
        });

        document.querySelectorAll('.edit-task').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const taskId = parseInt(e.target.closest('.task-item').dataset.taskId);
                this.openTaskModal(taskId);
            });
        });
    }

    populateSubjectDropdowns() {
        const subjectDropdowns = document.querySelectorAll('#taskSubject, #noteSubject');
        subjectDropdowns.forEach(dropdown => {
            dropdown.innerHTML = '';
            this.dataManager.subjects.forEach(subject => {
                const option = document.createElement('option');
                option.value = subject.id;
                option.textContent = subject.name;
                dropdown.appendChild(option);
            });
        });
    }

    openTaskModal(taskId = null) {
        this.dataManager.currentTaskId = taskId;
        const modal = this.elements.taskModal;
        
        if (taskId) {
            const task = this.dataManager.tasks.find(t => t.id === taskId);
            if (task) {
                document.getElementById('modalTitle').textContent = 'Edit Task';
                document.getElementById('taskTitle').value = task.title;
                document.getElementById('taskCategory').value = task.category;
                document.getElementById('taskSubject').value = task.subjectId;
                document.getElementById('taskPriority').value = task.priority || 'medium';
                document.getElementById('taskDuration').value = task.duration;
                document.getElementById('taskDate').value = task.date;
                document.getElementById('taskNotes').value = task.notes || '';
            }
        } else {
            document.getElementById('modalTitle').textContent = 'Add New Task';
            this.elements.taskForm.reset();
            document.getElementById('taskDate').value = new Date().toISOString().split('T')[0];
            document.getElementById('taskPriority').value = 'medium';
        }

        modal.classList.add('active');
    }

    handleTaskSubmit() {
        const taskData = {
            title: document.getElementById('taskTitle').value,
            category: document.getElementById('taskCategory').value,
            subjectId: parseInt(document.getElementById('taskSubject').value),
            priority: document.getElementById('taskPriority').value,
            duration: document.getElementById('taskDuration').value,
            date: document.getElementById('taskDate').value,
            notes: document.getElementById('taskNotes').value
        };

        if (this.dataManager.currentTaskId) {
            this.dataManager.updateTask(this.dataManager.currentTaskId, taskData);
        } else {
            this.dataManager.addTask(taskData);
        }

        this.closeModals();
        this.updateUI();
        if (this.currentPage === 'tasks') this.renderAllTasks();
    }

    openSubjectModal(subjectId = null) {
        this.dataManager.currentSubjectId = subjectId;
        const modal = this.elements.subjectModal;
        
        if (subjectId) {
            const subject = this.dataManager.subjects.find(s => s.id === subjectId);
            if (subject) {
                document.getElementById('subjectName').value = subject.name;
                document.getElementById('subjectPriority').value = subject.priority;
            }
        } else {
            this.elements.subjectForm.reset();
        }

        modal.classList.add('active');
    }

    handleSubjectSubmit() {
        const subjectData = {
            name: document.getElementById('subjectName').value,
            priority: document.getElementById('subjectPriority').value
        };

        if (this.dataManager.currentSubjectId) {
            this.dataManager.updateSubject(this.dataManager.currentSubjectId, subjectData);
        } else {
            this.dataManager.addSubject(subjectData);
        }

        this.closeModals();
        this.populateSubjectDropdowns();
        this.renderSubjects();
    }

    openNoteModal(noteId = null) {
        this.dataManager.currentNoteId = noteId;
        const modal = this.elements.noteModal;
        
        if (noteId) {
            const note = this.dataManager.notes.find(n => n.id === noteId);
            if (note) {
                document.getElementById('noteTitle').value = note.title;
                document.getElementById('noteSubject').value = note.subjectId;
                document.getElementById('noteContent').value = note.content;
            }
        } else {
            this.elements.noteForm.reset();
        }

        modal.classList.add('active');
    }

    handleNoteSubmit() {
        const noteData = {
            title: document.getElementById('noteTitle').value,
            subjectId: parseInt(document.getElementById('noteSubject').value),
            content: document.getElementById('noteContent').value
        };

        if (this.dataManager.currentNoteId) {
            // Update note
            const index = this.dataManager.notes.findIndex(n => n.id === this.dataManager.currentNoteId);
            if (index !== -1) {
                this.dataManager.notes[index] = { ...this.dataManager.notes[index], ...noteData };
                this.dataManager.saveData('notes', this.dataManager.notes);
            }
        } else {
            this.dataManager.addNote(noteData);
        }

        this.closeModals();
        this.renderNotes();
    }

    renderSubjects() {
        const subjects = this.dataManager.subjects;
        
        this.elements.subjectsGrid.innerHTML = subjects.length === 0
            ? '<p style="text-align: center; color: var(--text-secondary); padding: 2rem;">No subjects yet. Add your first subject!</p>'
            : subjects.map(subject => {
                const stats = this.dataManager.getSubjectStats(subject.id);
                const hours = Math.floor(stats.totalMinutes / 60);
                const minutes = stats.totalMinutes % 60;
                
                return `
                    <div class="subject-card">
                        <div class="subject-header">
                            <div>
                                <div class="subject-title">${subject.name}</div>
                                <div class="subject-priority">${subject.priority}</div>
                            </div>
                            <div class="subject-actions">
                                <button class="task-action-btn edit-subject" data-subject-id="${subject.id}">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="task-action-btn delete-subject" data-subject-id="${subject.id}">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                        <div class="subject-stats">
                            <div class="stat-row">
                                <span class="stat-label">Tasks Completed:</span>
                                <span class="stat-value">${stats.completedTasks}/${stats.totalTasks}</span>
                            </div>
                            <div class="stat-row">
                                <span class="stat-label">Study Time:</span>
                                <span class="stat-value">${hours}h ${minutes}m</span>
                            </div>
                            <div class="stat-row">
                                <span class="stat-label">Completion Rate:</span>
                                <span class="stat-value">${stats.completionRate}%</span>
                            </div>
                            <div class="progress-small">
                                <div class="progress-small-fill" style="width: ${stats.completionRate}%"></div>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');

        // Attach event listeners
        document.querySelectorAll('.edit-subject').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const subjectId = parseInt(e.target.closest('.edit-subject').dataset.subjectId);
                this.openSubjectModal(subjectId);
            });
        });

        document.querySelectorAll('.delete-subject').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const subjectId = parseInt(e.target.closest('.delete-subject').dataset.subjectId);
                if (confirm('Delete this subject? All related tasks and notes will remain but unlinked.')) {
                    this.dataManager.deleteSubject(subjectId);
                    this.populateSubjectDropdowns();
                    this.renderSubjects();
                }
            });
        });
    }

    renderNotes() {
        const notes = this.dataManager.notes;
        
        this.elements.notesGrid.innerHTML = notes.length === 0
            ? '<p style="text-align: center; color: var(--text-secondary); padding: 2rem;">No notes yet. Create your first note!</p>'
            : notes.map(note => {
                const subject = this.dataManager.subjects.find(s => s.id === note.subjectId);
                const subjectName = subject ? subject.name : 'Unknown';
                const date = new Date(note.createdAt).toLocaleDateString();
                
                return `
                    <div class="note-card">
                        <div class="note-header">
                            <div>
                                <div class="note-title">${note.title}</div>
                                <div class="note-subject">${subjectName}</div>
                            </div>
                            <button class="task-action-btn delete-note" data-note-id="${note.id}">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                        <div class="note-content">${note.content.substring(0, 150)}${note.content.length > 150 ? '...' : ''}</div>
                        <div class="note-meta">Created on ${date}</div>
                        <div class="note-actions">
                            <button class="btn edit-note" data-note-id="${note.id}">Edit</button>
                        </div>
                    </div>
                `;
            }).join('');

        document.querySelectorAll('.delete-note').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const noteId = parseInt(e.target.closest('.delete-note').dataset.noteId);
                if (confirm('Delete this note?')) {
                    this.dataManager.deleteNote(noteId);
                    this.renderNotes();
                }
            });
        });

        document.querySelectorAll('.edit-note').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const noteId = parseInt(e.target.closest('.edit-note').dataset.noteId);
                this.openNoteModal(noteId);
            });
        });
    }

    handleDocumentUpload(files) {
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const documentData = {
                name: file.name,
                type: file.type,
                size: file.size,
                subjectId: parseInt(document.getElementById('taskSubject').value) || 1,
                file: URL.createObjectURL(file) // For demo purposes
            };
            
            this.dataManager.addDocument(documentData);
        }
        
        this.renderDocuments();
        document.getElementById('documentUpload').value = '';
    }

    renderDocuments() {
        const documents = this.dataManager.documents;
        
        this.elements.documentsGrid.innerHTML = documents.length === 0
            ? '<p style="text-align: center; color: var(--text-secondary); padding: 2rem;">No documents uploaded yet.</p>'
            : documents.map(doc => {
                const subject = this.dataManager.subjects.find(s => s.id === doc.subjectId);
                const subjectName = subject ? subject.name : 'Unknown';
                const date = new Date(doc.uploadedAt).toLocaleDateString();
                const size = (doc.size / 1024 / 1024).toFixed(2);
                
                // Get icon based on file type
                let icon = 'fa-file';
                if (doc.type.includes('pdf')) icon = 'fa-file-pdf';
                else if (doc.type.includes('word') || doc.name.endsWith('.doc') || doc.name.endsWith('.docx')) icon = 'fa-file-word';
                else if (doc.type.includes('excel') || doc.name.endsWith('.xls') || doc.name.endsWith('.xlsx')) icon = 'fa-file-excel';
                else if (doc.type.includes('powerpoint') || doc.name.endsWith('.ppt') || doc.name.endsWith('.pptx')) icon = 'fa-file-powerpoint';
                else if (doc.type.includes('image')) icon = 'fa-file-image';
                else if (doc.type.includes('video')) icon = 'fa-file-video';
                
                return `
                    <div class="document-card">
                        <div class="document-icon">
                            <i class="fas ${icon}"></i>
                        </div>
                        <div class="document-name">${doc.name}</div>
                        <div class="document-subject">${subjectName}</div>
                        <div class="document-meta">${size} MB • ${date}</div>
                        <div class="document-actions">
                            <button class="btn" onclick="window.open('${doc.file}', '_blank')">Open</button>
                            <button class="btn btn-danger delete-document" data-document-id="${doc.id}">Delete</button>
                        </div>
                    </div>
                `;
            }).join('');

        document.querySelectorAll('.delete-document').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const docId = parseInt(e.target.closest('.delete-document').dataset.documentId);
                if (confirm('Delete this document?')) {
                    this.dataManager.deleteDocument(docId);
                    this.renderDocuments();
                }
            });
        });
    }

    initializeTimetable() {
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        const times = ['9:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00'];
        
        let html = '<thead><tr><th>Time</th>';
        days.forEach(day => {
            html += `<th>${day}</th>`;
        });
        html += '</tr></thead><tbody>';
        
        times.forEach(time => {
            html += `<tr><td>${time}</td>`;
            days.forEach(() => {
                html += '<td></td>';
            });
            html += '</tr>';
        });
        
        html += '</tbody>';
        document.getElementById('timetableGrid').innerHTML = html;
    }

    generateTimetable() {
        const timetable = document.getElementById('timetableGrid');
        const rows = timetable.querySelectorAll('tbody tr');
        const subjects = this.dataManager.subjects;
        
        // Clear existing content
        rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            for (let i = 1; i < cells.length; i++) {
                cells[i].textContent = '';
                cells[i].style.backgroundColor = '';
            }
        });
        
        // Generate sample schedule
        if (subjects.length > 0) {
            const colors = ['#4361ee', '#3a0ca3', '#4cc9f0', '#f72585', '#7209b7'];
            
            rows.forEach((row, rowIndex) => {
                const cells = row.querySelectorAll('td');
                for (let i = 1; i < Math.min(cells.length, subjects.length + 1); i++) {
                    if (Math.random() > 0.3) { // 70% chance of having a class
                        const subject = subjects[(rowIndex + i) % subjects.length];
                        cells[i].textContent = subject.name;
                        cells[i].style.backgroundColor = colors[subject.id % colors.length] + '20';
                        cells[i].style.borderLeft = `4px solid ${colors[subject.id % colors.length]}`;
                    }
                }
            });
        }
        
        alert('AI-generated timetable created! This is a sample schedule. In a real app, this would be based on your actual tasks and preferences.');
    }

    initializePomodoro() {
        let pomodoroInterval = null;
        let timeLeft = 25 * 60;
        let isWorking = true;
        let pomodoroCount = parseInt(localStorage.getItem('todayPomodoros') || '0');

        const display = document.getElementById('pomodoroDisplay');
        const startBtn = document.getElementById('pomodoroStart');
        const resetBtn = document.getElementById('pomodoroReset');
        const countDisplay = document.getElementById('pomodoroCount');
        
        countDisplay.textContent = pomodoroCount;

        const updateDisplay = () => {
            const minutes = Math.floor(timeLeft / 60);
            const seconds = timeLeft % 60;
            display.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        };

        startBtn.addEventListener('click', () => {
            if (pomodoroInterval) {
                clearInterval(pomodoroInterval);
                pomodoroInterval = null;
                startBtn.textContent = 'Start';
            } else {
                pomodoroInterval = setInterval(() => {
                    timeLeft--;
                    updateDisplay();

                    if (timeLeft === 0) {
                        clearInterval(pomodoroInterval);
                        pomodoroInterval = null;
                        
                        if (isWorking) {
                            pomodoroCount++;
                            localStorage.setItem('todayPomodoros', pomodoroCount);
                            countDisplay.textContent = pomodoroCount;
                            alert('Great work! Time for a break!');
                            timeLeft = parseInt(document.getElementById('breakDuration').value) * 60;
                        } else {
                            alert('Break over! Ready for another session?');
                            timeLeft = parseInt(document.getElementById('workDuration').value) * 60;
                        }
                        
                        isWorking = !isWorking;
                        startBtn.textContent = 'Start';
                        updateDisplay();
                    }
                }, 1000);
                startBtn.textContent = 'Pause';
            }
        });

        resetBtn.addEventListener('click', () => {
            if (pomodoroInterval) {
                clearInterval(pomodoroInterval);
                pomodoroInterval = null;
            }
            timeLeft = parseInt(document.getElementById('workDuration').value) * 60;
            isWorking = true;
            startBtn.textContent = 'Start';
            updateDisplay();
        });
    }

    initializeAIAssistant() {
        // Quick chips
        const chips = [
            "Study tips for exams",
            "How to stay focused?",
            "Math problem help",
            "Create study schedule",
            "Motivation for studying"
        ];
        
        this.elements.quickChips.innerHTML = chips.map(chip => 
            `<div class="chip" data-chip="${chip}">${chip}</div>`
        ).join('');
        
        document.querySelectorAll('.chip').forEach(chip => {
            chip.addEventListener('click', (e) => {
                this.elements.chatInput.value = e.target.dataset.chip;
                this.elements.chatInput.focus();
            });
        });
        
        // Send button
        document.getElementById('sendChatBtn').addEventListener('click', () => {
            this.sendAIChatMessage();
        });
        
        // Enter key
        this.elements.chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendAIChatMessage();
            }
        });
        
        // Initial AI message
        if (this.dataManager.chatHistory.length === 0) {
            this.dataManager.addChatMessage({
                role: 'ai',
                content: 'Hello! I\'m your AI Study Assistant. How can I help you with your studies today?',
                timestamp: new Date().toISOString()
            });
        }
        
        this.renderChatHistory();
    }

    sendAIChatMessage() {
        const message = this.elements.chatInput.value.trim();
        if (!message) return;
        
        // Add user message
        this.dataManager.addChatMessage({
            role: 'user',
            content: message,
            timestamp: new Date().toISOString()
        });
        
        // Clear input
        this.elements.chatInput.value = '';
        
        // Render chat history
        this.renderChatHistory();
        
        // Simulate AI response after a short delay
        setTimeout(() => {
            this.generateAIResponse(message);
        }, 1000);
    }

    generateAIResponse(userMessage) {
        // Simple response logic - in a real app, this would connect to an AI API
        let response = "I'm here to help! ";
        
        if (userMessage.toLowerCase().includes('tip') || userMessage.toLowerCase().includes('help')) {
            response += "Here's a study tip: Try the Pomodoro Technique - study for 25 minutes, then take a 5-minute break. This helps maintain focus and prevents burnout.";
        } else if (userMessage.toLowerCase().includes('focus') || userMessage.toLowerCase().includes('concentrate')) {
            response += "To stay focused, try these techniques: 1) Eliminate distractions (phone, social media), 2) Set specific goals for each study session, 3) Take regular breaks, 4) Stay hydrated and well-fed.";
        } else if (userMessage.toLowerCase().includes('math') || userMessage.toLowerCase().includes('problem')) {
            response += "For math problems, try breaking them down into smaller steps. Write out each step clearly, and don't hesitate to look up similar examples. Practice regularly to build your skills!";
        } else if (userMessage.toLowerCase().includes('schedule') || userMessage.toLowerCase().includes('plan')) {
            response += "I can help you create a study schedule! Go to the Timetable tab to generate an AI-powered schedule based on your subjects and available study time.";
        } else if (userMessage.toLowerCase().includes('motivat')) {
            response += "Remember why you started! Every small step you take brings you closer to your goals. You've got this! Take breaks when needed and celebrate small wins.";
        } else {
            response += "I'm your AI Study Assistant. I can help with study tips, subject guidance, motivation, and creating study schedules. What would you like help with?";
        }
        
        // Add AI response
        this.dataManager.addChatMessage({
            role: 'ai',
            content: response,
            timestamp: new Date().toISOString()
        });
        
        // Render chat history
        this.renderChatHistory();
    }

    renderChatHistory() {
        this.elements.chatHistory.innerHTML = this.dataManager.chatHistory.map(msg => `
            <div class="message ${msg.role}">
                ${msg.content}
            </div>
        `).join('');
        
        // Scroll to bottom
        this.elements.chatHistory.scrollTop = this.elements.chatHistory.scrollHeight;
    }

    renderApps() {
        const apps = [
            { name: 'ChatGPT', icon: 'fa-robot', color: '#10a37f', url: 'https://chat.openai.com' },
            { name: 'Gemini', icon: 'fa-stars', color: '#4285f4', url: 'https://gemini.google.com' },
            { name: 'Quizlet', icon: 'fa-question-circle', color: '#47137d', url: 'https://quizlet.com' },
            { name: 'Duolingo', icon: 'fa-language', color: '#78c800', url: 'https://duolingo.com' },
            { name: 'YouTube', icon: 'fa-youtube', color: '#ff0000', url: 'https://youtube.com' }
        ];
        
        this.elements.appsGrid.innerHTML = apps.map(app => `
            <div class="app-card" style="--app-color: ${app.color}" data-url="${app.url}">
                <div class="app-icon">
                    <i class="fas ${app.icon}"></i>
                </div>
                <div class="app-name">${app.name}</div>
            </div>
        `).join('');
        
        // Add click handlers for app cards
        document.querySelectorAll('.app-card').forEach(card => {
            card.addEventListener('click', (e) => {
                const url = e.currentTarget.dataset.url;
                if (url) {
                    window.open(url, '_blank');
                }
            });
        });
    }

    updateStreak() {
        const streak = this.dataManager.getStreak();
        this.elements.streakCount.textContent = streak;
    }

    setFilter(filter) {
        this.currentFilter = filter;
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filter === filter);
        });
        this.renderAllTasks();
    }

    updateAnalytics() {
        const range = document.getElementById('analyticsRange').value;
        let report;
        
        if (range === 'week') report = this.dataManager.getWeeklyReport();
        else if (range === 'month') report = this.dataManager.getMonthlyReport();
        else if (range === 'year') report = this.dataManager.getYearlyReport();

        this.renderCharts(report);
    }

    renderCharts(report) {
        // Destroy existing charts
        Object.values(this.charts).forEach(chart => chart && chart.destroy());

        const isDark = document.body.dataset.theme === 'dark';
        const textColor = isDark ? '#d1d5db' : '#6c757d';
        const gridColor = isDark ? '#444444' : '#dee2e6';

        // Subject Chart
        const subjectCtx = document.getElementById('subjectChart');
        if (subjectCtx && Object.keys(report.subjectStats).length > 0) {
            this.charts.subject = new Chart(subjectCtx, {
                type: 'bar',
                data: {
                    labels: Object.keys(report.subjectStats),
                    datasets: [{
                        label: 'Study Time (minutes)',
                        data: Object.values(report.subjectStats),
                        backgroundColor: '#4361ee',
                        borderRadius: 8
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                        legend: { 
                            labels: { 
                                color: textColor,
                                font: { size: 14 }
                            }
                        },
                        title: {
                            display: false
                        }
                    },
                    scales: {
                        y: { 
                            beginAtZero: true,
                            ticks: { 
                                color: textColor,
                                font: { size: 12 }
                            },
                            grid: { 
                                color: gridColor 
                            }
                        },
                        x: { 
                            ticks: { 
                                color: textColor,
                                font: { size: 12 }
                            },
                            grid: { 
                                color: gridColor 
                            }
                        }
                    }
                }
            });
        }

        // Category Chart
        const categoryCtx = document.getElementById('categoryChart');
        if (categoryCtx && Object.keys(report.categoryStats).length > 0) {
            this.charts.category = new Chart(categoryCtx, {
                type: 'pie',
                data: {
                    labels: Object.keys(report.categoryStats),
                    datasets: [{
                        data: Object.values(report.categoryStats),
                        backgroundColor: [
                            '#4361ee', '#3a0ca3', '#4cc9f0', 
                            '#f72585', '#7209b7', '#3f37c9'
                        ]
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                        legend: { 
                            labels: { 
                                color: textColor,
                                font: { size: 14 }
                            }
                        }
                    }
                }
            });
        }

        // Completion Chart
        const completionCtx = document.getElementById('completionChart');
        if (completionCtx) {
            this.charts.completion = new Chart(completionCtx, {
                type: 'doughnut',
                data: {
                    labels: ['Completed', 'Incomplete'],
                    datasets: [{
                        data: [report.totalCompleted, report.totalTasks - report.totalCompleted],
                        backgroundColor: ['#4cc9f0', '#f72585']
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                        legend: { 
                            labels: { 
                                color: textColor,
                                font: { size: 14 }
                            }
                        }
                    }
                }
            });
        }

        // Activity Chart
        const activityCtx = document.getElementById('activityChart');
        if (activityCtx) {
            // Generate sample data for activity chart
            const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
            const data = days.map(() => Math.floor(Math.random() * 100) + 20);
            
            this.charts.activity = new Chart(activityCtx, {
                type: 'line',
                data: {
                    labels: days,
                    datasets: [{
                        label: 'Study Minutes',
                        data: data,
                        borderColor: '#4361ee',
                        backgroundColor: 'rgba(67, 97, 238, 0.1)',
                        tension: 0.4,
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                        legend: { 
                            labels: { 
                                color: textColor,
                                font: { size: 14 }
                            }
                        }
                    },
                    scales: {
                        y: { 
                            beginAtZero: true,
                            ticks: { 
                                color: textColor,
                                font: { size: 12 }
                            },
                            grid: { 
                                color: gridColor 
                            }
                        },
                        x: { 
                            ticks: { 
                                color: textColor,
                                font: { size: 12 }
                            },
                            grid: { 
                                color: gridColor 
                            }
                        }
                    }
                }
            });
        }
    }

    toggleTheme() {
        const currentTheme = document.body.dataset.theme || 'light';
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        document.body.dataset.theme = newTheme;
        this.dataManager.settings.theme = newTheme;
        this.dataManager.saveData('settings', this.dataManager.settings);
        
        const icon = this.elements.themeToggle.querySelector('i');
        icon.className = newTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';

        // Update charts if on analytics page
        if (this.currentPage === 'analytics') {
            this.updateAnalytics();
        }
    }

    loadTheme() {
        const theme = this.dataManager.settings.theme || 'light';
        document.body.dataset.theme = theme;
        const icon = this.elements.themeToggle.querySelector('i');
        icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }

    loadSettings() {
        document.getElementById('dailyGoalHours').value = this.dataManager.settings.dailyGoalHours || 4;
        document.getElementById('dailyReminders').checked = this.dataManager.settings.dailyReminders !== false;
        document.getElementById('revisionAlerts').checked = this.dataManager.settings.revisionAlerts !== false;
        document.getElementById('testAlerts').checked = this.dataManager.settings.testAlerts !== false;
    }

    saveDailyGoal() {
        const goalHours = parseInt(document.getElementById('dailyGoalHours').value);
        if (goalHours && goalHours > 0) {
            this.dataManager.settings.dailyGoalHours = goalHours;
            this.dataManager.saveData('settings', this.dataManager.settings);
            this.updateDailyProgress();
            alert('Daily goal saved!');
        }
    }

    closeModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.remove('active');
        });
        this.dataManager.currentTaskId = null;
        this.dataManager.currentSubjectId = null;
        this.dataManager.currentNoteId = null;
    }
}

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    const dataManager = new DataManager();
    const uiManager = new UIManager(dataManager);
    
    // Make uiManager globally accessible for inline event handlers
    window.uiManager = uiManager;
});
