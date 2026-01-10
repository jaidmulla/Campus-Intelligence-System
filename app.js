// State Management
const App = {
    user: null,
    view: 'login',
    selectedId: null,
    baseURL: window.location.origin,

    init: function() {
        this.checkSession();
    },

    showLoader: function() { 
        const loader = document.getElementById('loader');
        if (loader) loader.classList.remove('hidden'); 
    },
    hideLoader: function() { 
        const loader = document.getElementById('loader');
        if (loader) loader.classList.add('hidden'); 
    },

    checkSession: function() {
        this.showLoader();
        fetch(this.baseURL + '/api/session', {
            method: 'GET',
            credentials: 'include'
        })
        .then(response => response.json())
        .then(data => {
            if (data.success && data.user) {
                this.user = data.user;
                if(this.user.role === 'student') {
                    this.navigate('create');
                } else {
                    this.navigate('dashboard');
                }
            } else {
                this.renderLogin();
            }
            this.hideLoader();
        })
        .catch(error => {
            console.error('Session check failed:', error);
            this.renderLogin();
            this.hideLoader();
        });
    },

    showModal: function(title, content, onConfirm, confirmText = 'Confirm', cancelText = 'Cancel') {
        const modalContainer = document.getElementById('modal-container');
        modalContainer.innerHTML = `
            <div class="modal-overlay fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div class="modal-content glass-strong rounded-3xl max-w-md w-full p-8 shadow-2xl glow">
                    <div class="text-center mb-6">
                        <div class="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 glow">
                            <i class="fa-solid fa-circle-exclamation text-3xl text-white"></i>
                        </div>
                        <h3 class="text-2xl font-bold text-white mb-2">${title}</h3>
                        <p class="text-slate-300">${content}</p>
                    </div>
                    <div class="flex gap-3">
                        <button onclick="App.closeModal()" class="flex-1 px-6 py-3 bg-slate-700/50 hover:bg-slate-600/50 text-white rounded-xl font-semibold transition-all">
                            ${cancelText}
                        </button>
                        <button onclick="App.confirmModal()" class="flex-1 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-semibold shadow-lg transition-all glow">
                            ${confirmText}
                        </button>
                    </div>
                </div>
            </div>
        `;
        this.modalCallback = onConfirm;
    },

    closeModal: function() {
        document.getElementById('modal-container').innerHTML = '';
        this.modalCallback = null;
    },

    confirmModal: function() {
        if (this.modalCallback) this.modalCallback();
        this.closeModal();
    },

    navigate: function(viewName) {
        this.view = viewName;
        const app = document.getElementById('app');
        
        app.innerHTML = this.Sidebar() + `
            <div class="flex-1 h-full flex flex-col overflow-hidden">
                <header class="h-20 glass-strong border-b border-white/10 flex items-center justify-between px-8 z-10 sticky top-0">
                    <div>
                        <h2 class="text-2xl font-bold text-white capitalize tracking-tight">${viewName.replace('_', ' ')}</h2>
                        <p class="text-xs text-slate-400 font-medium mt-1">Welcome back, ${this.user.full_name}</p>
                    </div>
                    <div class="flex items-center gap-4">
                        <div class="glass px-4 py-2 rounded-full flex items-center gap-2 glow">
                            <span class="w-2 h-2 bg-green-400 rounded-full animate-pulse glow-green"></span>
                            <span class="text-xs font-bold text-green-400 uppercase tracking-wide">${this.user.role}</span>
                        </div>
                        <button onclick="App.logout()" class="w-10 h-10 rounded-full glass hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-all flex items-center justify-center">
                            <i class="fa-solid fa-power-off"></i>
                        </button>
                    </div>
                </header>
                <main id="main-content" class="flex-1 overflow-y-auto p-8 fade-in"></main>
            </div>
        `;

        const container = document.getElementById('main-content');
        this.showLoader();
        
        setTimeout(() => {
            if (viewName === 'dashboard') {
                this.loadDashboard(container);
            } else if (viewName === 'faculty_management') {
                this.loadFacultyManagement(container);
            } else if (viewName === 'create') {
                container.innerHTML = this.CreateView();
                this.hideLoader();
            } else if (viewName === 'detail') {
                this.loadFeedbackDetail(container);
            } else if (viewName === 'my_reports') {
                this.loadMyReports(container);
            }
        }, 300);
    },

    login: function() {
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        
        if (!username || !password) {
            this.showToast('Please enter both username and password', 'error');
            return;
        }
        
        this.showLoader();
        
        fetch(this.baseURL + '/api/login', {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                this.user = data.user;
                this.showToast('Login successful! Welcome back.', 'success');
                setTimeout(() => {
                    if(this.user.role === 'student') {
                        this.navigate('create');
                    } else {
                        this.navigate('dashboard');
                    }
                }, 1000);
            } else {
                this.showToast('Invalid credentials. Please try again.', 'error');
                this.hideLoader();
            }
        })
        .catch(error => {
            console.error('Login failed:', error);
            this.showToast('Login failed. Please try again.', 'error');
            this.hideLoader();
        });
    },

    logout: function() {
        this.showModal(
            'Confirm Logout',
            'Are you sure you want to log out of your session?',
            () => {
                fetch(this.baseURL + '/api/logout', {
                    method: 'POST',
                    credentials: 'include'
                })
                .then(() => {
                    this.user = null;
                    this.showToast('Logged out successfully', 'success');
                    setTimeout(() => this.renderLogin(), 500);
                })
                .catch(error => {
                    console.error('Logout failed:', error);
                    this.showToast('Logout failed', 'error');
                });
            },
            'Logout',
            'Cancel'
        );
    },

    submitFeedback: function() {
        const cat = document.getElementById('fb-cat').value;
        const sub = document.getElementById('fb-sub').value;
        const msg = document.getElementById('fb-msg').value;
        const pri = document.getElementById('fb-pri').value;

        if(!sub || !msg) {
            this.showToast('Please fill all required fields', 'error');
            return;
        }

        this.showLoader();
        
        fetch(this.baseURL + '/api/feedback', {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                category: cat, 
                subject: sub, 
                message: msg, 
                priority: pri 
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                this.showToast('Report submitted successfully!', 'success');
                document.getElementById('fb-sub').value = '';
                document.getElementById('fb-msg').value = '';
                if(this.user.role !== 'student') {
                    setTimeout(() => this.navigate('dashboard'), 1000);
                } else {
                    setTimeout(() => this.navigate('my_reports'), 1000);
                }
            } else {
                this.showToast('Failed to submit report', 'error');
            }
            this.hideLoader();
        })
        .catch(error => {
            console.error('Submit failed:', error);
            this.showToast('Submission failed. Please try again.', 'error');
            this.hideLoader();
        });
    },

    addFaculty: function() {
        const name = document.getElementById('nf-name').value;
        const user = document.getElementById('nf-user').value;
        const email = document.getElementById('nf-email').value;
        const phone = document.getElementById('nf-phone').value;
        const pass = document.getElementById('nf-pass').value;

        if(!name || !user || !email || !phone || !pass) {
            this.showToast('Please fill all fields', 'error');
            return;
        }

        this.showLoader();
        
        fetch(this.baseURL + '/api/users/add-faculty', {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                username: user, 
                password: pass, 
                full_name: name, 
                email: email, 
                phone: phone 
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                this.showToast('Faculty member added successfully!', 'success');
                setTimeout(() => this.navigate('faculty_management'), 1000);
            } else {
                this.showToast(data.error || 'Failed to add faculty', 'error');
            }
            this.hideLoader();
        })
        .catch(error => {
            console.error('Add faculty failed:', error);
            this.showToast('Failed to add faculty', 'error');
            this.hideLoader();
        });
    },

    deleteFaculty: function(id, name) {
        this.showModal(
            'Delete Faculty Member',
            `Are you sure you want to remove ${name}? All their assigned tasks will be unassigned.`,
            () => {
                this.showLoader();
                fetch(this.baseURL + '/api/users/' + id, {
                    method: 'DELETE',
                    credentials: 'include'
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        this.showToast('Faculty member removed', 'success');
                        this.navigate('faculty_management');
                    } else {
                        this.showToast('Failed to remove faculty', 'error');
                    }
                    this.hideLoader();
                })
                .catch(error => {
                    console.error('Delete failed:', error);
                    this.showToast('Failed to remove faculty', 'error');
                    this.hideLoader();
                });
            },
            'Delete',
            'Cancel'
        );
    },

    viewDetail: function(id) {
        this.selectedId = id;
        this.navigate('detail');
    },

    postComment: function() {
        const txt = document.getElementById('cmt-txt').value;
        if(!txt) {
            this.showToast('Please enter a comment', 'error');
            return;
        }
        
        this.showLoader();
        
        fetch(this.baseURL + '/api/feedback/' + this.selectedId + '/comments', {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ comment: txt })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                this.showToast('Comment posted', 'success');
                this.loadFeedbackDetail(document.getElementById('main-content'));
            } else {
                this.showToast('Failed to post comment', 'error');
            }
            this.hideLoader();
        })
        .catch(error => {
            console.error('Post comment failed:', error);
            this.showToast('Failed to post comment', 'error');
            this.hideLoader();
        });
    },

    updateTicket: function() {
        const status = document.getElementById('up-status').value;
        const priority = document.getElementById('up-priority') ? document.getElementById('up-priority').value : null;
        const assigned_to = document.getElementById('up-assign') ? document.getElementById('up-assign').value : null;
        
        const updateData = { status: status };
        if (priority) updateData.priority = priority;
        if (assigned_to !== null) updateData.assigned_to = assigned_to || null;

        this.showLoader();
        
        fetch(this.baseURL + '/api/feedback/' + this.selectedId, {
            method: 'PUT',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(updateData)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                this.showToast('Ticket updated successfully!', 'success');
                this.loadFeedbackDetail(document.getElementById('main-content'));
            } else {
                this.showToast(data.error || 'Failed to update ticket', 'error');
            }
            this.hideLoader();
        })
        .catch(error => {
            console.error('Update failed:', error);
            this.showToast('Failed to update ticket', 'error');
            this.hideLoader();
        });
    },

    loadDashboard: function(container) {
        fetch(this.baseURL + '/api/stats', {
            method: 'GET',
            credentials: 'include'
        })
        .then(response => response.json())
        .then(stats => {
            fetch(this.baseURL + '/api/feedback', {
                method: 'GET',
                credentials: 'include'
            })
            .then(response => response.json())
            .then(feedback => {
                container.innerHTML = this.DashboardView(stats, feedback);
                this.hideLoader();
            })
            .catch(error => {
                console.error('Load feedback failed:', error);
                container.innerHTML = '<div class="text-center text-red-400 p-8">Failed to load dashboard</div>';
                this.hideLoader();
            });
        })
        .catch(error => {
            console.error('Load stats failed:', error);
            container.innerHTML = '<div class="text-center text-red-400 p-8">Failed to load dashboard</div>';
            this.hideLoader();
        });
    },

    loadFacultyManagement: function(container) {
        fetch(this.baseURL + '/api/faculty-stats', {
            method: 'GET',
            credentials: 'include'
        })
        .then(response => response.json())
        .then(facultyStats => {
            container.innerHTML = this.FacultyManagementView(facultyStats);
            this.hideLoader();
        })
        .catch(error => {
            console.error('Load faculty management failed:', error);
            container.innerHTML = '<div class="text-center text-red-400 p-8">Failed to load faculty management</div>';
            this.hideLoader();
        });
    },

    loadFeedbackDetail: function(container) {
        fetch(this.baseURL + '/api/feedback/' + this.selectedId, {
            method: 'GET',
            credentials: 'include'
        })
        .then(response => response.json())
        .then(data => {
            fetch(this.baseURL + '/api/users/faculty', {
                method: 'GET',
                credentials: 'include'
            })
            .then(response => response.json())
            .then(facultyList => {
                container.innerHTML = this.DetailView(data, facultyList);
                this.hideLoader();
            })
            .catch(error => {
                console.error('Load faculty list failed:', error);
                container.innerHTML = this.DetailView(data, []);
                this.hideLoader();
            });
        })
        .catch(error => {
            console.error('Load feedback detail failed:', error);
            container.innerHTML = '<div class="text-center text-red-400 p-8">Failed to load feedback detail</div>';
            this.hideLoader();
        });
    },

    loadMyReports: function(container) {
        fetch(this.baseURL + '/api/feedback', {
            method: 'GET',
            credentials: 'include'
        })
        .then(response => response.json())
        .then(myReports => {
            container.innerHTML = this.MyReportsView(myReports);
            this.hideLoader();
        })
        .catch(error => {
            console.error('Load my reports failed:', error);
            container.innerHTML = '<div class="text-center text-red-400 p-8">Failed to load reports</div>';
            this.hideLoader();
        });
    },

    showToast: function(message, type = 'info') {
        const toast = document.createElement('div');
        const bgColor = type === 'success' ? 'from-green-500 to-emerald-600' : 
                       type === 'error' ? 'from-red-500 to-rose-600' : 
                       'from-blue-500 to-indigo-600';
        const icon = type === 'success' ? 'fa-check-circle' : 
                    type === 'error' ? 'fa-exclamation-circle' : 
                    'fa-info-circle';
        
        toast.className = `fixed top-6 right-6 z-50 glass-strong rounded-2xl px-6 py-4 shadow-2xl flex items-center gap-3 slide-in max-w-md ${type === 'success' ? 'glow-green' : type === 'error' ? 'glow-orange' : 'glow'}`;
        toast.innerHTML = `
            <div class="w-10 h-10 bg-gradient-to-br ${bgColor} rounded-xl flex items-center justify-center flex-shrink-0">
                <i class="fa-solid ${icon} text-white"></i>
            </div>
            <span class="text-white font-medium">${message}</span>
        `;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 4000);
    },

    renderLogin: function() {
        const app = document.getElementById('app');
        app.innerHTML = `
        <div class="w-full h-full flex items-center justify-center relative overflow-hidden">
            <div class="glass-strong w-full max-w-md rounded-3xl p-10 shadow-2xl relative z-10 fade-in glow">
                <div class="text-center mb-10">
                    <div class="w-20 h-20 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-2xl glow relative">
                        <i class="fa-solid fa-bolt text-4xl text-white animate-pulse"></i>
                        <div class="absolute inset-0 bg-gradient-to-br from-indigo-400 to-purple-400 rounded-2xl blur-xl opacity-50 animate-pulse"></div>
                    </div>
                    <h1 class="text-5xl font-extrabold text-white tracking-tight mb-2">NEXUS</h1>
                    <p class="text-slate-400 font-medium">Campus Intelligence System</p>
                </div>
                <div class="space-y-5">
                    <div class="group">
                        <label class="block text-xs font-bold text-slate-400 uppercase mb-2 ml-1">Username</label>
                        <input id="username" class="w-full px-5 py-4 glass-strong border border-white/20 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-white placeholder-slate-500 font-medium" placeholder="Enter username">
                    </div>
                    <div class="group">
                        <label class="block text-xs font-bold text-slate-400 uppercase mb-2 ml-1">Password</label>
                        <input id="password" type="password" class="w-full px-5 py-4 glass-strong border border-white/20 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-white placeholder-slate-500 font-medium" placeholder="••••••••">
                    </div>
                    <button onclick="App.login()" class="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold py-4 rounded-xl shadow-2xl transform transition hover:scale-105 active:scale-95 text-lg mt-4 glow">
                        Sign In
                        <i class="fa-solid fa-arrow-right ml-2"></i>
                    </button>
                </div>
                <div class="mt-8 pt-6 border-t border-white/10">
                    <p class="text-xs text-slate-500 font-bold uppercase tracking-wider mb-3 text-center">Demo Credentials</p>
                    <div class="grid grid-cols-3 gap-2 text-xs">
                        <div class="glass p-3 rounded-lg text-center">
                            <p class="text-slate-400 mb-1">Dean</p>
                            <p class="text-white font-mono font-bold">dean/123</p>
                        </div>
                        <div class="glass p-3 rounded-lg text-center">
                            <p class="text-slate-400 mb-1">Student</p>
                            <p class="text-white font-mono font-bold">student/123</p>
                        </div>
                        <div class="glass p-3 rounded-lg text-center">
                            <p class="text-slate-400 mb-1">Faculty</p>
                            <p class="text-white font-mono font-bold">faculty1/123</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>`;
    },

    Sidebar: function() {
        const menuItems = [];
        
        if (this.user.role !== 'student') {
            menuItems.push({ icon: 'fa-grid-2', label: 'Dashboard', view: 'dashboard' });
        }
        
        if (this.user.role === 'dean') {
            menuItems.push({ icon: 'fa-users-gear', label: 'Faculty Management', view: 'faculty_management' });
        }
        
        if (this.user.role === 'student') {
            menuItems.push({ icon: 'fa-pen-to-square', label: 'Submit Report', view: 'create' });
            menuItems.push({ icon: 'fa-folder-open', label: 'My Reports', view: 'my_reports' });
        } else {
            menuItems.push({ icon: 'fa-plus-circle', label: 'Create Report', view: 'create' });
        }

        return `
        <aside class="w-72 glass-strong border-r border-white/10 flex flex-col z-30 shadow-2xl hidden md:flex slide-in">
            <div class="h-24 flex items-center px-8 border-b border-white/10">
                <div class="flex items-center gap-3">
                    <div class="w-12 h-12 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center text-white shadow-lg glow">
                        <i class="fa-solid fa-bolt text-xl"></i>
                    </div>
                    <div>
                        <span class="text-2xl font-bold text-white tracking-tight">NEXUS</span>
                        <p class="text-xs text-slate-400 font-medium">v2.0</p>
                    </div>
                </div>
            </div>
            
            <div class="flex-1 py-6 px-4 space-y-2">
                ${menuItems.map(item => `
                <div onclick="App.navigate('${item.view}')" 
                     class="group flex items-center gap-3 px-5 py-4 rounded-2xl cursor-pointer transition-all duration-200 ${this.view === item.view ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg glow' : 'text-slate-400 hover:bg-white/5 hover:text-white'}">
                    <i class="fa-solid ${item.icon} text-lg w-6"></i>
                    <span class="font-semibold">${item.label}</span>
                </div>`).join('')}
            </div>
            
            <div class="p-6">
                <div class="glass rounded-2xl p-5 border border-white/10">
                    <p class="text-xs font-bold text-indigo-400 uppercase mb-3 tracking-wider">System Status</p>
                    <div class="flex items-center gap-3 mb-3">
                        <span class="relative flex h-3 w-3">
                          <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                          <span class="relative inline-flex rounded-full h-3 w-3 bg-green-500 glow-green"></span>
                        </span>
                        <span class="text-sm font-bold text-white">All Systems Operational</span>
                    </div>
                    <div class="pt-3 border-t border-white/10">
                        <div class="flex justify-between text-xs mb-1">
                            <span class="text-slate-400">Server Load</span>
                            <span class="text-white font-bold">23%</span>
                        </div>
                        <div class="h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
                            <div class="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full glow-green" style="width: 23%"></div>
                        </div>
                    </div>
                </div>
            </div>
        </aside>
        `;
    },

    DashboardView: function(stats, feedback) {
        const recentFeedback = feedback.slice(0, 6);
        
        // Load faculty tasks if needed
        if (this.user.role === 'faculty') {
            setTimeout(() => {
                this.loadFacultyTasks();
            }, 100);
        }

        return `
        <div class="space-y-8">
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div class="grad-card-1 rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden hover-lift glow">
                    <div class="absolute right-0 top-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 blur-2xl"></div>
                    <div class="relative z-10">
                        <div class="flex items-center justify-between mb-4">
                            <div class="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                                <i class="fa-solid fa-clipboard-list text-2xl"></i>
                            </div>
                            <span class="text-xs font-bold opacity-60 uppercase tracking-wider">Total</span>
                        </div>
                        <h3 class="text-5xl font-extrabold mb-2">${stats.total || 0}</h3>
                        <p class="text-indigo-100 text-sm font-medium">Total Reports</p>
                    </div>
                </div>
                
                <div class="grad-card-2 rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden hover-lift glow">
                    <div class="absolute right-0 top-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 blur-2xl"></div>
                    <div class="relative z-10">
                        <div class="flex items-center justify-between mb-4">
                            <div class="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                                <i class="fa-solid fa-clock text-2xl"></i>
                            </div>
                            <span class="text-xs font-bold opacity-60 uppercase tracking-wider">Pending</span>
                        </div>
                        <h3 class="text-5xl font-extrabold mb-2">${stats.pending || 0}</h3>
                        <p class="text-blue-100 text-sm font-medium">Awaiting Action</p>
                    </div>
                </div>
                
                <div class="grad-card-4 rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden hover-lift glow-orange">
                    <div class="absolute right-0 top-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 blur-2xl"></div>
                    <div class="relative z-10">
                        <div class="flex items-center justify-between mb-4">
                            <div class="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                                <i class="fa-solid fa-spinner text-2xl"></i>
                            </div>
                            <span class="text-xs font-bold opacity-60 uppercase tracking-wider">Active</span>
                        </div>
                        <h3 class="text-5xl font-extrabold mb-2">${stats.processing || 0}</h3>
                        <p class="text-orange-100 text-sm font-medium">In Progress</p>
                    </div>
                </div>
                
                <div class="grad-card-3 rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden hover-lift glow-green">
                    <div class="absolute right-0 top-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 blur-2xl"></div>
                    <div class="relative z-10">
                        <div class="flex items-center justify-between mb-4">
                            <div class="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                                <i class="fa-solid fa-check-circle text-2xl"></i>
                            </div>
                            <span class="text-xs font-bold opacity-60 uppercase tracking-wider">Done</span>
                        </div>
                        <h3 class="text-5xl font-extrabold mb-2">${stats.resolved || 0}</h3>
                        <p class="text-emerald-100 text-sm font-medium">Completed</p>
                    </div>
                </div>
            </div>

            ${this.user.role === 'faculty' ? `
            <div class="glass-strong rounded-3xl p-8 border border-white/10 shadow-xl" id="tasks-section">
                <h3 class="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                    <span class="w-1.5 h-8 bg-gradient-to-b from-indigo-500 to-purple-600 rounded-full"></span> 
                    My Assigned Tasks
                </h3>
                <div class="text-center text-slate-400 p-8">
                    <i class="fa-solid fa-spinner animate-spin text-2xl mb-3"></i>
                    <p>Loading tasks...</p>
                </div>
            </div>` : ''}

            <div class="glass-strong rounded-3xl border border-white/10 overflow-hidden shadow-xl">
                <div class="px-8 py-6 border-b border-white/10 flex justify-between items-center">
                    <h3 class="font-bold text-white text-xl">Recent Activity</h3>
                    <span class="text-sm text-slate-400 font-medium">${recentFeedback.length} items</span>
                </div>
                <div class="divide-y divide-white/5">
                    ${recentFeedback.length > 0 ? recentFeedback.map(item => `
                    <div onclick="App.viewDetail(${item.id})" class="px-8 py-6 hover:bg-white/5 cursor-pointer transition-all group">
                        <div class="flex justify-between items-start mb-3">
                            <div class="flex items-center gap-3 flex-1">
                                <div class="w-3 h-3 rounded-full ${item.status==='resolved'?'bg-green-500 glow-green':item.status==='processing'?'bg-yellow-500 glow-orange':'bg-blue-500 glow'} flex-shrink-0"></div>
                                <h4 class="font-bold text-white text-lg group-hover:text-indigo-400 transition-colors flex-1">${item.subject}</h4>
                            </div>
                            <span class="text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full ${item.status==='resolved'?'bg-green-500/20 text-green-400 border border-green-500/30':item.status==='processing'?'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30':'bg-blue-500/20 text-blue-400 border border-blue-500/30'}">${item.status}</span>
                        </div>
                        <p class="text-slate-400 pl-6 mb-4 line-clamp-1 text-sm">${item.message}</p>
                        <div class="flex gap-6 pl-6 text-xs font-medium text-slate-500">
                            <span class="flex items-center gap-2"><i class="fa-solid fa-tag text-indigo-400"></i> ${item.category}</span>
                            <span class="flex items-center gap-2"><i class="fa-solid fa-flag text-indigo-400"></i> ${item.priority}</span>
                            <span class="flex items-center gap-2"><i class="fa-regular fa-clock text-indigo-400"></i> ${new Date(item.created_at).toLocaleDateString()}</span>
                            ${item.assigned_to ? `<span class="text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded border border-indigo-500/20">→ ${item.assigned_to}</span>` : ''}
                        </div>
                    </div>`).join('') : 
                    '<div class="px-8 py-12 text-center text-slate-400"><i class="fa-solid fa-inbox text-3xl mb-3"></i><p>No recent activity</p></div>'}
                </div>
            </div>
        </div>`;
    },

    loadFacultyTasks: function() {
        fetch(this.baseURL + '/api/faculty/tasks', {
            method: 'GET',
            credentials: 'include'
        })
        .then(response => response.json())
        .then(tasks => {
            const tasksSection = document.getElementById('tasks-section');
            if (tasksSection) {
                if (tasks.length > 0) {
                    tasksSection.innerHTML = `
                        <h3 class="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                            <span class="w-1.5 h-8 bg-gradient-to-b from-indigo-500 to-purple-600 rounded-full"></span> 
                            My Assigned Tasks
                        </h3>
                        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            ${tasks.map(t => `
                            <div onclick="App.viewDetail(${t.id})" class="glass rounded-2xl p-6 border border-white/10 hover:border-indigo-500/50 transition-all cursor-pointer group hover-lift">
                                <div class="flex justify-between items-start mb-4">
                                    <span class="px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide ${t.priority==='high'?'bg-red-500/20 text-red-400 border border-red-500/30':t.priority==='medium'?'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30':'bg-blue-500/20 text-blue-400 border border-blue-500/30'}">${t.priority}</span>
                                    <span class="text-xs font-mono text-slate-500">#${t.id}</span>
                                </div>
                                <h4 class="font-bold text-white text-lg mb-3 line-clamp-2 group-hover:text-indigo-400 transition-colors">${t.subject}</h4>
                                <p class="text-sm text-slate-400 line-clamp-2 mb-4 leading-relaxed">${t.message}</p>
                                <div class="flex justify-between items-center pt-4 border-t border-white/10">
                                    <span class="text-xs font-semibold text-slate-500">${new Date(t.created_at).toLocaleDateString()}</span>
                                    <div class="w-8 h-8 rounded-full bg-slate-700/50 flex items-center justify-center text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                        <i class="fa-solid fa-arrow-right text-xs"></i>
                                    </div>
                                </div>
                            </div>`).join('')}
                        </div>`;
                } else {
                    tasksSection.innerHTML = `
                        <h3 class="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                            <span class="w-1.5 h-8 bg-gradient-to-b from-indigo-500 to-purple-600 rounded-full"></span> 
                            My Assigned Tasks
                        </h3>
                        <div class="text-center text-slate-400 p-8">
                            <i class="fa-solid fa-check-circle text-2xl mb-3"></i>
                            <p>No assigned tasks</p>
                        </div>`;
                }
            }
        })
        .catch(error => {
            console.error('Load tasks failed:', error);
        });
    },

    FacultyManagementView: function(facultyStats) {
        return `
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div class="lg:col-span-2 space-y-6">
                <div class="glass-strong rounded-3xl p-8 border border-white/10 shadow-xl">
                    <div class="flex justify-between items-center mb-8">
                        <div>
                            <h3 class="text-2xl font-bold text-white mb-2">Faculty Directory</h3>
                            <p class="text-slate-400 text-sm">${facultyStats.length} active members</p>
                        </div>
                        <div class="glass px-4 py-2 rounded-xl border border-white/10">
                            <span class="text-sm font-semibold text-white">${facultyStats.reduce((sum, f) => sum + f.total_assigned, 0)} Total Tasks</span>
                        </div>
                    </div>
                    
                    <div class="space-y-4">
                        ${facultyStats.length > 0 ? facultyStats.map(f => `
                        <div class="glass rounded-2xl p-6 border border-white/10 hover:border-indigo-500/30 transition-all group">
                            <div class="flex items-start justify-between mb-4">
                                <div class="flex items-center gap-4">
                                    <div class="w-14 h-14 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg glow flex-shrink-0">
                                        ${f.name.split(' ').map(n => n[0]).join('')}
                                    </div>
                                    <div>
                                        <h4 class="font-bold text-white text-lg mb-1">${f.name}</h4>
                                        <div class="flex items-center gap-3 text-xs text-slate-400 font-medium">
                                            <span class="flex items-center gap-1">
                                                <i class="fa-solid fa-user text-indigo-400"></i>
                                                @${f.username}
                                            </span>
                                            <span class="w-1 h-1 rounded-full bg-slate-600"></span>
                                            <span class="flex items-center gap-1">
                                                <i class="fa-solid fa-envelope text-indigo-400"></i>
                                                ${f.email}
                                            </span>
                                            <span class="w-1 h-1 rounded-full bg-slate-600"></span>
                                            <span class="flex items-center gap-1">
                                                <i class="fa-solid fa-phone text-indigo-400"></i>
                                                ${f.phone}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <button onclick="App.deleteFaculty(${f.id}, '${f.name}')" class="w-10 h-10 rounded-xl glass hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-all flex items-center justify-center">
                                    <i class="fa-solid fa-trash"></i>
                                </button>
                            </div>
                            
                            <div class="grid grid-cols-3 gap-4 pt-4 border-t border-white/5">
                                <div class="text-center glass rounded-xl p-3 border border-white/5">
                                    <div class="text-2xl font-bold text-white mb-1">${f.total_assigned}</div>
                                    <div class="text-xs text-slate-400 uppercase tracking-wider">Assigned</div>
                                </div>
                                <div class="text-center glass rounded-xl p-3 border border-green-500/20">
                                    <div class="text-2xl font-bold text-green-400 mb-1">${f.resolved}</div>
                                    <div class="text-xs text-green-400/70 uppercase tracking-wider">Resolved</div>
                                </div>
                                <div class="text-center glass rounded-xl p-3 border border-yellow-500/20">
                                    <div class="text-2xl font-bold text-yellow-400 mb-1">${f.pending}</div>
                                    <div class="text-xs text-yellow-400/70 uppercase tracking-wider">Pending</div>
                                </div>
                            </div>
                            
                            <div class="mt-4">
                                <div class="flex items-center justify-between mb-2">
                                    <span class="text-xs text-slate-400 font-medium">Completion Rate</span>
                                    <span class="text-xs text-white font-bold">${f.total_assigned ? Math.round((f.resolved/f.total_assigned)*100) : 0}%</span>
                                </div>
                                <div class="h-2 bg-slate-800/50 rounded-full overflow-hidden">
                                    <div class="h-full bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full glow" style="width:${f.total_assigned ? (f.resolved/f.total_assigned)*100 : 0}%"></div>
                                </div>
                            </div>
                        </div>`).join('') : 
                        '<div class="text-center text-slate-400 p-12"><i class="fa-solid fa-users-slash text-3xl mb-3"></i><p>No faculty members found</p></div>'}
                    </div>
                </div>
            </div>
            
            <div class="glass-strong rounded-3xl p-8 border border-white/10 shadow-xl h-fit sticky top-6">
                <h3 class="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                    <i class="fa-solid fa-user-plus text-indigo-400"></i>
                    Add Faculty
                </h3>
                <div class="space-y-5">
                    <div>
                        <label class="block text-xs font-bold text-slate-400 uppercase mb-2 ml-1">Full Name *</label>
                        <input id="nf-name" class="w-full px-4 py-3 glass border border-white/20 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-white placeholder-slate-500 text-sm" placeholder="Dr. Jane Doe">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-400 uppercase mb-2 ml-1">Username *</label>
                        <input id="nf-user" class="w-full px-4 py-3 glass border border-white/20 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-white placeholder-slate-500 text-sm" placeholder="jdoe">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-400 uppercase mb-2 ml-1">Email *</label>
                        <input id="nf-email" type="email" class="w-full px-4 py-3 glass border border-white/20 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-white placeholder-slate-500 text-sm" placeholder="faculty@nexus.edu">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-400 uppercase mb-2 ml-1">Phone *</label>
                        <input id="nf-phone" type="tel" class="w-full px-4 py-3 glass border border-white/20 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-white placeholder-slate-500 text-sm" placeholder="+1 (555) 000-0000">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-400 uppercase mb-2 ml-1">Password *</label>
                        <input id="nf-pass" type="password" class="w-full px-4 py-3 glass border border-white/20 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-white placeholder-slate-500 text-sm" placeholder="••••••••">
                    </div>
                    <button onclick="App.addFaculty()" class="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-bold shadow-lg transition-all mt-2 glow">
                        <i class="fa-solid fa-plus mr-2"></i>
                        Create Account
                    </button>
                </div>
            </div>
        </div>`;
    },

    DetailView: function(item, facultyList) {
        const canManage = this.user.role === 'dean' || this.user.role === 'faculty';

        return `
        <div class="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8 fade-in">
            <div class="lg:col-span-2 space-y-6">
                <div class="glass-strong rounded-3xl p-10 border border-white/10 shadow-xl relative overflow-hidden">
                    <div class="absolute top-0 right-0 p-8 opacity-5 text-9xl font-black text-white select-none">#${item.id}</div>
                    <div class="relative z-10">
                        <div class="flex gap-3 mb-6 flex-wrap">
                            <span class="bg-indigo-500/20 text-indigo-400 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider border border-indigo-500/30 glow">
                                <i class="fa-solid fa-tag mr-2"></i>${item.category}
                            </span>
                            <span class="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider border ${item.status==='resolved'?'bg-green-500/20 text-green-400 border-green-500/30 glow-green':item.status==='processing'?'bg-yellow-500/20 text-yellow-400 border-yellow-500/30 glow-orange':'bg-blue-500/20 text-blue-400 border-blue-500/30 glow'}">
                                <i class="fa-solid fa-circle-notch mr-2"></i>${item.status}
                            </span>
                            <span class="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider border ${item.priority==='high'?'bg-red-500/20 text-red-400 border-red-500/30':item.priority==='medium'?'bg-yellow-500/20 text-yellow-400 border-yellow-500/30':'bg-blue-500/20 text-blue-400 border-blue-500/30'}">
                                <i class="fa-solid fa-flag mr-2"></i>${item.priority}
                            </span>
                        </div>
                        <h1 class="text-3xl font-extrabold text-white mb-6 leading-tight">${item.subject}</h1>
                        <p class="text-slate-300 text-base leading-relaxed mb-6">${item.message}</p>
                        <div class="flex items-center gap-6 pt-6 border-t border-white/10 text-sm text-slate-400">
                            <span class="flex items-center gap-2">
                                <i class="fa-solid fa-user text-indigo-400"></i>
                                ${item.author_role}
                            </span>
                            <span class="flex items-center gap-2">
                                <i class="fa-solid fa-calendar text-indigo-400"></i>
                                ${new Date(item.created_at).toLocaleString()}
                            </span>
                            ${item.assigned_to ? `
                            <span class="flex items-center gap-2 text-indigo-400">
                                <i class="fa-solid fa-user-check"></i>
                                Assigned to ${item.assigned_to}
                            </span>` : ''}
                        </div>
                    </div>
                </div>
                
                <div class="glass-strong rounded-3xl p-8 border border-white/10 shadow-xl">
                    <h3 class="text-xl font-bold text-white mb-6 flex items-center gap-3">
                        <i class="fa-regular fa-comments text-indigo-400"></i> 
                        Discussion Thread
                        <span class="ml-auto text-sm text-slate-400 font-normal">${item.comments ? item.comments.length : 0} comments</span>
                    </h3>
                    <div class="space-y-6 mb-8">
                        ${item.comments && item.comments.length > 0 ? item.comments.map(c => `
                        <div class="flex gap-4">
                            <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex-shrink-0 flex items-center justify-center font-bold text-white shadow-lg glow">
                                ${c.full_name.split(' ').map(n => n[0]).join('')}
                            </div>
                            <div class="glass p-5 rounded-2xl rounded-tl-none border border-white/10 flex-1">
                                <div class="flex justify-between items-baseline mb-2">
                                    <span class="font-bold text-white">${c.full_name}</span>
                                    <span class="text-xs text-slate-500">${new Date(c.created_at).toLocaleString()}</span>
                                </div>
                                <p class="text-sm text-slate-300 leading-relaxed">${c.comment}</p>
                            </div>
                        </div>`).join('') : '<p class="text-center text-slate-500 py-8">No comments yet. Start the discussion!</p>'}
                    </div>
                    <div class="flex gap-3">
                        <input id="cmt-txt" class="flex-1 px-5 py-4 glass border border-white/20 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-white placeholder-slate-500" placeholder="Write a comment...">
                        <button onclick="App.postComment()" class="px-6 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl shadow-lg transition-all flex items-center justify-center font-bold glow">
                            <i class="fa-solid fa-paper-plane mr-2"></i>
                            Post
                        </button>
                    </div>
                </div>
            </div>
            
            <div class="space-y-6">
                <div class="glass-strong rounded-3xl p-8 border border-white/10 shadow-xl">
                    <h3 class="text-lg font-bold text-white uppercase tracking-wider mb-6 flex items-center gap-2">
                        <i class="fa-solid fa-sliders text-indigo-400"></i>
                        Ticket Management
                    </h3>
                    <div class="space-y-5">
                        <div>
                            <label class="block text-slate-400 text-xs font-bold uppercase mb-2">Status</label>
                            <select id="up-status" class="w-full px-4 py-3 glass border border-white/20 rounded-xl font-semibold text-white outline-none focus:ring-2 focus:ring-indigo-500" ${!canManage?'disabled':''}>
                                <option value="pending" ${item.status==='pending'?'selected':''}>Pending</option>
                                <option value="processing" ${item.status==='processing'?'selected':''}>Processing</option>
                                <option value="resolved" ${item.status==='resolved'?'selected':''}>Resolved</option>
                            </select>
                        </div>
                        
                        ${this.user.role === 'dean' ? `
                        <div>
                            <label class="block text-slate-400 text-xs font-bold uppercase mb-2">Priority Level</label>
                            <select id="up-priority" class="w-full px-4 py-3 glass border border-white/20 rounded-xl font-semibold text-white outline-none focus:ring-2 focus:ring-indigo-500">
                                <option value="low" ${item.priority==='low'?'selected':''}>Low Priority</option>
                                <option value="medium" ${item.priority==='medium'?'selected':''}>Medium Priority</option>
                                <option value="high" ${item.priority==='high'?'selected':''}>High Priority</option>
                            </select>
                        </div>
                        
                        <div>
                            <label class="block text-slate-400 text-xs font-bold uppercase mb-2">Assign To Faculty</label>
                            <select id="up-assign" class="w-full px-4 py-3 glass border border-white/20 rounded-xl font-semibold text-white outline-none focus:ring-2 focus:ring-indigo-500">
                                <option value="">Unassigned</option>
                                ${facultyList.map(f=>`<option value="${f.full_name}" ${item.assigned_to===f.full_name?'selected':''}>${f.full_name}</option>`).join('')}
                            </select>
                        </div>` : ''}
                        
                        ${canManage ? `
                        <button onclick="App.updateTicket()" class="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-bold shadow-lg transition-all mt-4 glow">
                            <i class="fa-solid fa-save mr-2"></i>
                            Update Ticket
                        </button>` : ''}
                    </div>
                </div>
                
                <div class="glass rounded-2xl p-6 border border-white/10">
                    <h4 class="text-sm font-bold text-slate-400 uppercase mb-4">Quick Actions</h4>
                    <div class="space-y-2">
                        <button onclick="App.navigate('dashboard')" class="w-full px-4 py-3 glass hover:bg-white/10 text-white rounded-xl text-sm font-semibold transition-all flex items-center gap-2">
                            <i class="fa-solid fa-arrow-left"></i>
                            Back to Dashboard
                        </button>
                    </div>
                </div>
            </div>
        </div>`;
    },

    CreateView: function() {
        return `
        <div class="max-w-3xl mx-auto glass-strong rounded-3xl p-10 border border-white/10 shadow-2xl fade-in glow">
            <div class="text-center mb-10">
                <div class="w-16 h-16 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg glow">
                    <i class="fa-solid fa-pen-to-square text-3xl text-white"></i>
                </div>
                <h2 class="text-4xl font-extrabold text-white mb-2">Submit New Report</h2>
                <p class="text-slate-400">Fill out the form below to create a feedback report</p>
            </div>
            
            <div class="space-y-6">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label class="block text-xs font-bold text-slate-400 uppercase mb-2 ml-1">Category *</label>
                        <select id="fb-cat" class="w-full px-4 py-3 glass border border-white/20 rounded-xl text-white outline-none focus:ring-2 focus:ring-indigo-500 font-medium">
                            <option value="academic">Academic</option>
                            <option value="facility">Facility</option>
                            <option value="administrative">Administrative</option>
                            <option value="technical">Technical</option>
                            <option value="other">Other</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-400 uppercase mb-2 ml-1">Priority *</label>
                        <select id="fb-pri" class="w-full px-4 py-3 glass border border-white/20 rounded-xl text-white outline-none focus:ring-2 focus:ring-indigo-500 font-medium">
                            <option value="low">Low - Minor Issue</option>
                            <option value="medium" selected>Medium - Moderate Impact</option>
                            <option value="high">High - Urgent</option>
                        </select>
                    </div>
                </div>
                
                <div>
                    <label class="block text-xs font-bold text-slate-400 uppercase mb-2 ml-1">Subject *</label>
                    <input id="fb-sub" class="w-full px-4 py-3 glass border border-white/20 rounded-xl text-white outline-none focus:ring-2 focus:ring-indigo-500 placeholder-slate-500 font-medium" placeholder="Brief summary of your issue...">
                </div>
                
                <div>
                    <label class="block text-xs font-bold text-slate-400 uppercase mb-2 ml-1">Detailed Description *</label>
                    <textarea id="fb-msg" rows="6" class="w-full px-4 py-3 glass border border-white/20 rounded-xl text-white outline-none focus:ring-2 focus:ring-indigo-500 placeholder-slate-500 font-medium resize-none" placeholder="Provide detailed information about your feedback or issue..."></textarea>
                </div>
                
                <div class="flex gap-4 pt-6">
                    ${this.user.role !== 'student' ? `
                    <button onclick="App.navigate('dashboard')" class="flex-1 px-8 py-4 glass hover:bg-white/10 text-white rounded-xl font-bold shadow-lg transition-all">
                        Cancel
                    </button>` : ''}
                    <button onclick="App.submitFeedback()" class="flex-1 px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-bold shadow-lg transition-all transform hover:scale-105 active:scale-95 glow">
                        <i class="fa-solid fa-paper-plane mr-2"></i>
                        Submit Report
                    </button>
                </div>
            </div>
        </div>`;
    },

    MyReportsView: function(myReports) {
        return `
        <div class="space-y-6">
            <div class="glass-strong rounded-3xl p-8 border border-white/10 shadow-xl">
                <div class="flex justify-between items-center mb-8">
                    <div>
                        <h3 class="text-2xl font-bold text-white mb-2">My Reports</h3>
                        <p class="text-slate-400 text-sm">${myReports.length} total submissions</p>
                    </div>
                    <button onclick="App.navigate('create')" class="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-bold shadow-lg transition-all glow">
                        <i class="fa-solid fa-plus mr-2"></i>
                        New Report
                    </button>
                </div>
                
                ${myReports.length > 0 ? `
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    ${myReports.map(item => `
                    <div onclick="App.viewDetail(${item.id})" class="glass rounded-2xl p-6 border border-white/10 hover:border-indigo-500/50 transition-all cursor-pointer group hover-lift">
                        <div class="flex justify-between items-start mb-4">
                            <span class="px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide ${item.status==='resolved'?'bg-green-500/20 text-green-400 border border-green-500/30 glow-green':item.status==='processing'?'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 glow-orange':'bg-blue-500/20 text-blue-400 border border-blue-500/30 glow'}">${item.status}</span>
                            <span class="text-xs font-mono text-slate-500">#${item.id}</span>
                        </div>
                        <h4 class="font-bold text-white text-lg mb-3 line-clamp-2 group-hover:text-indigo-400 transition-colors">${item.subject}</h4>
                        <p class="text-sm text-slate-400 line-clamp-2 mb-4 leading-relaxed">${item.message}</p>
                        <div class="flex justify-between items-center pt-4 border-t border-white/10">
                            <div class="flex gap-2">
                                <span class="px-2 py-1 rounded text-xs font-semibold ${item.priority==='high'?'bg-red-500/20 text-red-400':item.priority==='medium'?'bg-yellow-500/20 text-yellow-400':'bg-blue-500/20 text-blue-400'}">${item.priority}</span>
                                <span class="px-2 py-1 rounded text-xs font-semibold bg-indigo-500/20 text-indigo-400">${item.category}</span>
                            </div>
                            <div class="w-8 h-8 rounded-full glass flex items-center justify-center text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                <i class="fa-solid fa-arrow-right text-xs"></i>
                            </div>
                        </div>
                    </div>`).join('')}
                </div>` : `
                <div class="text-center py-16">
                    <div class="w-20 h-20 bg-slate-800/50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <i class="fa-solid fa-inbox text-4xl text-slate-600"></i>
                    </div>
                    <h4 class="text-xl font-bold text-white mb-2">No Reports Yet</h4>
                    <p class="text-slate-400 mb-6">You haven't submitted any feedback reports</p>
                    <button onclick="App.navigate('create')" class="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-bold shadow-lg transition-all glow">
                        Submit Your First Report
                    </button>
                </div>`}
            </div>
        </div>`;
    }
};

// Start App
window.onload = () => App.init();
