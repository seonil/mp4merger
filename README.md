# MP4 Video Merger - Electron Desktop App

USB/외장드라이브의 MP4 비디오 파일들을 복사하지 않고 직접 병합하는 데스크톱 애플리케이션입니다.

## 🚀 주요 기능

- **🗂️ 네이티브 폴더 선택**: Windows 파일 탐색기로 폴더 직접 선택
- **💾 외부 드라이브 지원**: USB, 외장하드 등 모든 드라이브 접근 가능
- **🚀 로컬 처리**: 파일 업로드 없이 원본 위치에서 직접 작업
- **📁 결과 저장**: 선택한 폴더 내 `merged_output` 폴더에 병합된 파일 저장
- **📊 정렬 기능**: 파일명 또는 생성일 기준으로 정렬 가능

## 📋 시스템 요구사항

- **운영체제**: Windows 10 이상
- **Node.js**: 18.0 이상
- **FFmpeg**: 비디오 처리를 위해 필요

## 🛠️ 설치 방법

### 1. 저장소 클론
```bash
git clone https://github.com/YOUR_USERNAME/mp4editor.git
cd mp4editor
```

### 2. 의존성 설치
```bash
# 루트 디렉토리 의존성 설치
npm install

# 클라이언트 의존성 설치
cd client
npm install
cd ..
```

### 3. FFmpeg 설치
#### Windows (권장)
1. [FFmpeg 공식 사이트](https://ffmpeg.org/download.html)에서 Windows 빌드 다운로드
2. 압축 해제 후 `bin` 폴더를 시스템 PATH에 추가
3. 또는 [Chocolatey](https://chocolatey.org/) 사용:
   ```bash
   choco install ffmpeg
   ```

#### 설치 확인
```bash
ffmpeg -version
```

## 🚀 실행 방법

### 개발 모드
```bash
npm run electron-dev
```

### 프로덕션 모드
```bash
# React 앱 빌드
npm run build

# Electron 앱 실행
npm run electron
```

### 배포용 실행 파일 생성
```bash
npm run electron-pack
```

## 📖 사용법

### 1. 앱 실행
- `npm run electron-dev` 또는 `npm run electron` 명령어로 앱 실행
- Electron 데스크톱 앱 창이 열립니다

### 2. 폴더 선택
- **"📁 Select Video Folder"** 버튼 클릭
- Windows 파일 탐색기에서 MP4 파일이 있는 폴더 선택
- USB 드라이브, 외장하드 등 모든 위치 지원

### 3. 비디오 확인
- 선택한 폴더의 MP4 파일들이 자동으로 목록에 표시
- 파일 크기와 생성일 확인 가능
- 이름 또는 날짜 기준으로 정렬 가능

### 4. 병합 실행
- **"Merge Videos"** 버튼 클릭 (2개 이상 파일 필요)
- 병합 과정이 시작되며 진행 상황 표시
- 완료 시 성공 메시지 표시

### 5. 결과 확인
- 병합된 파일은 선택한 폴더 내 `merged_output` 폴더에 저장
- 파일명 형식: `merged-[타임스탬프].mp4`

## 📁 프로젝트 구조

```
mp4editor/
├── client/                 # React 프론트엔드
│   ├── src/
│   │   ├── App.js         # 메인 컴포넌트
│   │   └── App.css        # 스타일
│   └── package.json
├── electron.js            # Electron 메인 프로세스
├── preload.js             # Electron 보안 브리지
├── package.json           # 루트 패키지 설정
└── README.md
```

## 🛠️ 개발 스크립트

| 명령어 | 설명 |
|--------|------|
| `npm run client` | React 개발 서버만 실행 |
| `npm run electron` | Electron 앱 실행 |
| `npm run electron-dev` | 개발 모드 (React + Electron) |
| `npm run build` | React 앱 빌드 |
| `npm run electron-pack` | 배포용 실행 파일 생성 |

## 🔧 문제 해결

### "FFmpeg not found" 에러
- FFmpeg가 시스템 PATH에 추가되어 있는지 확인
- `ffmpeg -version` 명령어로 설치 상태 확인

### "Failed to fetch" 에러
- Electron 앱을 다시 시작해보세요
- 개발 모드: `npm run electron-dev`

### 포트 충돌 문제
- 앱이 자동으로 사용 가능한 포트를 찾습니다
- 기본 포트: 5002 (백엔드), 3000 (프론트엔드)

### 권한 에러 (Windows)
- 관리자 권한으로 명령 프롬프트 실행
- 바이러스 백신 소프트웨어가 차단하는지 확인

## 🤝 기여하기

1. 이 저장소를 포크합니다
2. 새 기능 브랜치를 생성합니다 (`git checkout -b feature/AmazingFeature`)
3. 변경사항을 커밋합니다 (`git commit -m 'Add some AmazingFeature'`)
4. 브랜치에 푸시합니다 (`git push origin feature/AmazingFeature`)
5. Pull Request를 생성합니다

## 📄 라이선스

이 프로젝트는 ISC 라이선스를 따릅니다.

## 🔗 관련 기술

- **Electron**: 크로스 플랫폼 데스크톱 앱
- **React**: 사용자 인터페이스
- **Express**: 백엔드 API 서버
- **FFmpeg**: 비디오 처리
- **Bootstrap**: UI 스타일링

## 📞 지원

문제가 발생하거나 질문이 있으시면 GitHub Issues를 통해 문의해주세요.

---

**주의사항**:
- 대용량 비디오 파일 병합 시 시간이 오래 걸릴 수 있습니다
- 충분한 저장 공간이 있는지 확인하세요
- 원본 파일은 수정되지 않으며 새로운 병합 파일이 생성됩니다