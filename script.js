// Dữ liệu tài khoản
let accountsData = [];
let filteredData = [];
let currentAccount = null;
let currentFileName = 'accounts_export_20250530_004500.txt';
let fileMetadata = {};

// Khởi tạo khi trang load
document.addEventListener('DOMContentLoaded', function() {
    loadAccountsData();
    setupEventListeners();
});

// Thiết lập event listeners
function setupEventListeners() {
    // Tìm kiếm
    document.getElementById('searchInput').addEventListener('input', handleSearch);

    // Upload file
    document.getElementById('fileInput').addEventListener('change', handleFileUpload);

    // Đóng modal
    document.querySelector('.close').addEventListener('click', closeModal);
    document.getElementById('detailModal').addEventListener('click', function(e) {
        if (e.target === this) closeModal();
    });

    // ESC để đóng modal
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') closeModal();
    });
}

// Load dữ liệu từ file txt
async function loadAccountsData(fileName = null) {
    try {
        showLoading(true);

        // Sử dụng file name được chỉ định hoặc file mặc định
        const fileToLoad = fileName || currentFileName;

        // Đọc file txt
        const response = await fetch(fileToLoad);
        const text = await response.text();

        // Parse dữ liệu
        const parseResult = parseAccountsData(text);
        accountsData = parseResult.accounts;
        fileMetadata = parseResult.metadata;
        filteredData = [...accountsData];

        // Cập nhật tên file hiển thị
        if (fileName) {
            currentFileName = fileName;
            document.getElementById('fileName').textContent = fileName;
        }

        // Hiển thị dữ liệu
        renderAccountsTable();
        updateStats();
        updateFileInfo();

        showLoading(false);
        showToast(`Đã tải thành công ${accountsData.length} tài khoản từ ${fileToLoad}`);
    } catch (error) {
        console.error('Lỗi khi load dữ liệu:', error);
        showError('Không thể tải dữ liệu tài khoản');
        showLoading(false);
    }
}

// Xử lý upload file
async function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Kiểm tra định dạng file
    if (!file.name.toLowerCase().endsWith('.txt')) {
        showError('Vui lòng chọn file .txt');
        return;
    }

    try {
        showLoading(true);

        // Đọc nội dung file
        const text = await readFileAsText(file);

        // Parse dữ liệu
        const parseResult = parseAccountsData(text);

        if (parseResult.accounts.length === 0) {
            showError('File không chứa dữ liệu tài khoản hợp lệ');
            showLoading(false);
            return;
        }

        // Cập nhật dữ liệu
        accountsData = parseResult.accounts;
        fileMetadata = parseResult.metadata;
        filteredData = [...accountsData];
        currentFileName = file.name;

        // Cập nhật giao diện
        document.getElementById('fileName').textContent = file.name;
        renderAccountsTable();
        updateStats();
        updateFileInfo();

        showLoading(false);
        showToast(`Đã cập nhật thành công ${accountsData.length} tài khoản từ ${file.name}`);

        // Reset input để có thể upload lại cùng file
        event.target.value = '';

    } catch (error) {
        console.error('Lỗi khi xử lý file:', error);
        showError('Lỗi khi đọc file. Vui lòng kiểm tra định dạng file.');
        showLoading(false);
    }
}

// Đọc file như text
function readFileAsText(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(e);
        reader.readAsText(file, 'UTF-8');
    });
}

// Làm mới dữ liệu
async function refreshData() {
    await loadAccountsData();
}

// Parse dữ liệu từ text
function parseAccountsData(text) {
    console.log('Raw text:', text.substring(0, 500)); // Debug: xem text thô

    const accounts = [];
    const lines = text.split('\n');
    let currentAccount = {};
    let accountNumber = 0;
    const metadata = {
        exportTime: '',
        totalAccounts: 0,
        title: ''
    };

    console.log('Total lines:', lines.length); // Debug: số dòng

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        console.log(`Line ${i}: "${line}"`); // Debug: xem từng dòng

        // Parse metadata từ header
        if (line.includes('DANH SÁCH TÀI KHOẢN')) {
            metadata.title = line;
            console.log('Found title:', line);
        } else if (line.startsWith('Thời gian xuất:')) {
            metadata.exportTime = line.replace('Thời gian xuất:', '').trim();
            console.log('Found export time:', metadata.exportTime);
        } else if (line.startsWith('Tổng số tài khoản:')) {
            metadata.totalAccounts = parseInt(line.replace('Tổng số tài khoản:', '').trim()) || 0;
            console.log('Found total accounts:', metadata.totalAccounts);
        }
        // Parse account data
        else if (line.match(/^\d+\./)) {
            // Bắt đầu tài khoản mới
            if (Object.keys(currentAccount).length > 0) {
                console.log('🔥 Adding account:', currentAccount); // Debug
                accounts.push(currentAccount);
            }
            currentAccount = {};
            accountNumber++;
            currentAccount.stt = accountNumber;
            console.log('🆕 Starting account #', accountNumber, 'from line:', line); // Debug

            // Kiểm tra nếu dòng này cũng chứa thông tin tài khoản (format: "1. Tài khoản: username")
            if (line.includes('Tài khoản:')) {
                const parts = line.split('Tài khoản:');
                console.log('🔍 Same line account parts:', parts);
                const username = parts[1]?.trim();
                currentAccount.username = username;
                console.log('✅ Found username (same line):', `"${username}"`);
            }
        } else if (line.includes('Tài khoản:')) {
            const parts = line.split('Tài khoản:');
            console.log('🔍 Account line parts:', parts);
            const username = parts[1]?.trim();
            currentAccount.username = username;
            console.log('✅ Found username:', `"${username}"`); // Debug với quotes
        } else if (line.includes('Mật khẩu:')) {
            const parts = line.split('Mật khẩu:');
            console.log('🔍 Password line parts:', parts);
            const password = parts[1]?.trim();
            currentAccount.password = password;
            console.log('✅ Found password:', `"${password}"`); // Debug với quotes
        } else if (line.includes('Họ tên:')) {
            const parts = line.split('Họ tên:');
            console.log('🔍 Name line parts:', parts);
            const fullName = parts[1]?.trim();
            currentAccount.fullName = fullName;
            console.log('✅ Found fullName:', `"${fullName}"`); // Debug với quotes
        } else if (line.includes('Trạng thái:')) {
            const status = line.split('Trạng thái:')[1]?.trim();
            currentAccount.status = status;
            console.log('✅ Found status:', `"${status}"`);
        } else if (line.includes('Thưởng:')) {
            const reward = line.split('Thưởng:')[1]?.trim();
            currentAccount.reward = reward;
            console.log('✅ Found reward:', `"${reward}"`);
        } else if (line.includes('Thời gian:')) {
            const time = line.split('Thời gian:')[1]?.trim();
            currentAccount.time = time;
            console.log('✅ Found time:', `"${time}"`);
        } else if (line.length > 0) {
            console.log('❓ Unmatched line:', `"${line}"`);
        }
    }

    // Thêm tài khoản cuối cùng
    if (Object.keys(currentAccount).length > 0) {
        console.log('Adding final account:', currentAccount); // Debug
        accounts.push(currentAccount);
    }

    console.log('Final accounts array:', accounts); // Debug

    return {
        accounts: accounts,
        metadata: metadata
    };
}

// Hiển thị bảng tài khoản
function renderAccountsTable() {
    const tbody = document.getElementById('accountsBody');

    if (filteredData.length === 0) {
        tbody.innerHTML = '';
        showNoData(true);
        return;
    }

    showNoData(false);

    tbody.innerHTML = filteredData.map(account => {
        // Debug: log từng account
        console.log('Rendering account:', account);

        // Đảm bảo các giá trị không undefined
        const stt = account.stt || 'N/A';
        const username = account.username || 'undefined';
        const password = account.password || '';
        const fullName = account.fullName || '';
        const status = account.status || '';
        const reward = account.reward || '';
        const time = account.time || '';

        return `
        <tr>
            <td>${stt}</td>
            <td class="account-info">${username}</td>
            <td>
                <input type="password" class="password-field" value="${password}" readonly>
                <button class="btn btn-copy" onclick="togglePassword(this)" title="Hiện/Ẩn mật khẩu">
                    <i class="fas fa-eye"></i>
                </button>
            </td>
            <td>${fullName}</td>
            <td><span class="status-success">${status}</span></td>
            <td><span class="reward">${reward}</span></td>
            <td>${formatDateTime(time)}</td>
            <td>
                <button class="btn btn-copy" onclick="copyAccount('${username}')" title="Sao chép tài khoản">
                    <i class="fas fa-copy"></i>
                </button>
                <button class="btn btn-copy" onclick="copyPassword('${password}')" title="Sao chép mật khẩu">
                    <i class="fas fa-key"></i>
                </button>
                <button class="btn btn-detail" onclick="showDetail(${stt})" title="Xem chi tiết">
                    <i class="fas fa-info-circle"></i>
                </button>
            </td>
        </tr>
        `;
    }).join('');
}

// Tìm kiếm
function handleSearch() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();

    filteredData = accountsData.filter(account =>
        account.username.toLowerCase().includes(searchTerm) ||
        account.fullName.toLowerCase().includes(searchTerm) ||
        account.password.toLowerCase().includes(searchTerm)
    );

    renderAccountsTable();
    updateStats();
}

// Cập nhật thống kê
function updateStats() {
    document.getElementById('totalAccounts').textContent = filteredData.length;
}

// Cập nhật thông tin file
function updateFileInfo() {
    const fileInfoDiv = document.getElementById('fileInfo');
    const exportTimeSpan = document.getElementById('exportTime');
    const totalInFileSpan = document.getElementById('totalInFile');
    const headerSubtitle = document.getElementById('headerSubtitle');

    if (fileMetadata.exportTime || fileMetadata.totalAccounts > 0) {
        // Hiển thị thông tin metadata nếu có
        fileInfoDiv.style.display = 'flex';
        exportTimeSpan.textContent = fileMetadata.exportTime || '-';
        totalInFileSpan.textContent = fileMetadata.totalAccounts || accountsData.length;

        if (fileMetadata.title) {
            headerSubtitle.textContent = fileMetadata.title;
        }
    } else {
        // Ẩn thông tin metadata nếu không có
        fileInfoDiv.style.display = 'none';
        headerSubtitle.textContent = 'Danh sách tài khoản đã đăng ký';
    }
}

// Sao chép tài khoản
function copyAccount(username) {
    copyToClipboard(username, 'Đã sao chép tài khoản!');
}

// Sao chép mật khẩu
function copyPassword(password) {
    copyToClipboard(password, 'Đã sao chép mật khẩu!');
}

// Sao chép vào clipboard
async function copyToClipboard(text, message) {
    try {
        await navigator.clipboard.writeText(text);
        showToast(message);
    } catch (err) {
        // Fallback cho trình duyệt cũ
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showToast(message);
    }
}

// Hiện/ẩn mật khẩu
function togglePassword(button) {
    const input = button.previousElementSibling;
    const icon = button.querySelector('i');

    if (input.type === 'password') {
        input.type = 'text';
        icon.className = 'fas fa-eye-slash';
    } else {
        input.type = 'password';
        icon.className = 'fas fa-eye';
    }
}

// Hiển thị chi tiết tài khoản
function showDetail(stt) {
    currentAccount = accountsData.find(acc => acc.stt === stt);
    if (!currentAccount) return;

    const modalBody = document.getElementById('modalBody');
    modalBody.innerHTML = `
        <div class="detail-item">
            <div class="detail-label">Số thứ tự:</div>
            <div class="detail-value">${currentAccount.stt}</div>
        </div>
        <div class="detail-item">
            <div class="detail-label">Tài khoản:</div>
            <div class="detail-value">${currentAccount.username}</div>
        </div>
        <div class="detail-item">
            <div class="detail-label">Mật khẩu:</div>
            <div class="detail-value">${currentAccount.password}</div>
        </div>
        <div class="detail-item">
            <div class="detail-label">Họ tên:</div>
            <div class="detail-value">${currentAccount.fullName}</div>
        </div>
        <div class="detail-item">
            <div class="detail-label">Trạng thái:</div>
            <div class="detail-value">${currentAccount.status}</div>
        </div>
        <div class="detail-item">
            <div class="detail-label">Thưởng:</div>
            <div class="detail-value">${currentAccount.reward}</div>
        </div>
        <div class="detail-item">
            <div class="detail-label">Thời gian:</div>
            <div class="detail-value">${currentAccount.time}</div>
        </div>
    `;

    document.getElementById('detailModal').style.display = 'block';
}

// Sao chép tất cả thông tin
function copyAllInfo() {
    if (!currentAccount) return;

    const info = `Tài khoản: ${currentAccount.username}
Mật khẩu: ${currentAccount.password}
Họ tên: ${currentAccount.fullName}
Trạng thái: ${currentAccount.status}
Thưởng: ${currentAccount.reward}
Thời gian: ${currentAccount.time}`;

    copyToClipboard(info, 'Đã sao chép tất cả thông tin!');
}

// Đóng modal
function closeModal() {
    document.getElementById('detailModal').style.display = 'none';
    currentAccount = null;
}

// Hiển thị toast
function showToast(message) {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');

    toastMessage.textContent = message;
    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Hiển thị loading
function showLoading(show) {
    document.getElementById('loading').style.display = show ? 'block' : 'none';
    document.querySelector('.table-container').style.display = show ? 'none' : 'block';
}

// Hiển thị no data
function showNoData(show) {
    document.getElementById('noData').style.display = show ? 'block' : 'none';
    document.querySelector('.table-container').style.display = show ? 'none' : 'block';
}

// Hiển thị lỗi
function showError(message) {
    showToast(message);
}

// Format thời gian
function formatDateTime(dateTime) {
    if (!dateTime) return '';

    try {
        const date = new Date(dateTime);
        return date.toLocaleString('vi-VN');
    } catch (e) {
        return dateTime;
    }
}
