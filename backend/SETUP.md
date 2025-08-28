
# Настройка PostgreSQL и Backend

## 1. Установка PostgreSQL

### На Windows:
1. Скачайте PostgreSQL с официального сайта: https://www.postgresql.org/download/
2. Установите PostgreSQL с настройками по умолчанию
3. Запомните пароль для пользователя postgres

### На macOS:
```bash
brew install postgresql
brew services start postgresql
```

### На Ubuntu/Debian:
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

## 2. Создание базы данных

1. Войдите в PostgreSQL:
```bash
sudo -u postgres psql
```

2. Создайте базу данных:
```sql
CREATE DATABASE warehouse_db;
CREATE USER warehouse_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE warehouse_db TO warehouse_user;
\q
```

## 3. Настройка Backend

1. Перейдите в папку backend:
```bash
cd backend
```

2. Создайте виртуальное окружение:
```bash
python -m venv venv

# На Windows:
venv\Scripts\activate

# На macOS/Linux:
source venv/bin/activate
```

3. Установите зависимости:
```bash
pip install -r requirements.txt
```

4. Настройте файл .env:
```env
DATABASE_URL=postgresql://warehouse_user:your_password@localhost:5432/warehouse_db
```

5. Запустите сервер:
```bash
python main.py
```

Сервер будет доступен по адресу: http://localhost:8000
API документация: http://localhost:8000/docs

## 4. Подключение Frontend

В файле src/utils/storage.ts можно будет добавить API вызовы к backend.

## 5. Проверка подключения

Откройте http://localhost:8000/docs и проверьте что API работает.

## Основные команды PostgreSQL:

```bash
# Проверить статус
sudo systemctl status postgresql

# Запустить
sudo systemctl start postgresql

# Остановить
sudo systemctl stop postgresql

# Перезапустить
sudo systemctl restart postgresql

# Подключиться к базе
psql -h localhost -U warehouse_user -d warehouse_db
```
