# 코딩 AI 프롬프트 전문가 팀 - Arxiv Search 프로젝트

---

## 🔷 1단계: Sam의 구조 분석

### 작업 목적 및 범위 정의

* **핵심 목표** : arXiv 논문 검색, AI 요약/번역, 관심 분야 기반 신규 논문 알림 시스템 구축
* **작업 범위** : 풀스택 웹 애플리케이션 (프론트엔드 + 백엔드 + 스케줄링 + 외부 연동)
* **예상 결과물** : 로그인/관리자 승인 기반의 논문 검색·요약·번역·알림 웹 서비스

### 컨텍스트 요구사항 분석

* **외부 의존성** : arXiv API (검색/메타데이터), arXiv HTML 논문 뷰, AI 요약/번역 API, Telegram Bot API, 이메일 발송 서비스(SMTP/SendGrid 등)
* **인증 시스템** : 회원가입 → 관리자 승인 → 기능 접근 (2단계 인증 흐름)
* **데이터 영속성** : 사용자 정보, 관심 분류/키워드, 관심 논문 리스트, 알림 이력
* **스케줄링** : Cron 기반 일일 배치 처리 (신규 논문 탐지 + 알림 발송)

### 프롬프트 구조 설계

총 6개 핵심 모듈로 분해:

1. **인증/권한 모듈** - 회원가입, 로그인, 관리자 승인
2. **검색 모듈** - arXiv API 연동, 갤러리 UI, 검색 필터
3. **상세/요약 모듈** - AI 요약, 번역, 1:1 분할 뷰, 스크롤 동기화
4. **참고문헌 모듈** - 참고문헌 파싱, arXiv 존재 여부 확인, 링크 생성
5. **마이페이지 모듈** - 분류/키워드 관리, 관심 논문 리스트
6. **알림 모듈** - Cron 스케줄러, Telegram/이메일 알림 발송

### 모호성 제거 체크리스트

| 항목               | 명확화                                                  |
| ------------------ | ------------------------------------------------------- |
| "갤러리 형태"      | 카드 그리드 레이아웃 (제목, 저자, 날짜, 초록 일부 표시) |
| "HTML 형태를 이용" | arXiv의 ar5iv.labs.arxiv.org HTML 렌더링 활용           |
| "AI 요약"          | Claude API 또는 OpenAI API를 사용한 논문 요약           |
| "관리자 승인"      | 관리자 대시보드에서 가입 요청 승인/거부                 |
| "최근에 발행된"    | arXiv의 최근 7일 이내 제출/갱신된 논문                  |
| "정해진 시간"      | 사용자 설정 가능, 기본값 매일 오전 9시 (KST)            |
| "텔레그램 알림"    | Telegram Bot API를 통한 메시지 발송                     |
| "Advanced Search"  | arXiv API의 카테고리 + 키워드 복합 쿼리                 |

---

## 🔶 2단계: Jenny의 기술적 강화

### 기술 스택 권장사항

* **프론트엔드** : Next.js 14+ (App Router) + TypeScript 5
* **스타일링** : Tailwind CSS 3.4+ + shadcn/ui
* **상태 관리** : Zustand 또는 React Query (TanStack Query v5)
* **백엔드** : Next.js API Routes (또는 별도 Express/Fastify 서버)
* **DB** : PostgreSQL 16 + Prisma ORM
* **인증** : NextAuth.js v5 (Auth.js)
* **스케줄링** : node-cron 또는 별도 워커 프로세스
* **AI 통합** : Anthropic Claude API (요약/번역)
* **알림** : node-telegram-bot-api + Nodemailer
* **배포** : Docker + Docker Compose

### 코드 품질 가이드라인

* ESLint + Prettier 적용
* TypeScript strict 모드 필수
* API 응답 타입은 Zod 스키마로 검증
* 에러 바운더리 적용 (React Error Boundary)
* 서버/클라이언트 컴포넌트 명확히 분리
* API Rate Limiting 구현 (arXiv API 예의 준수: 3초 간격)

### 핵심 기술 지시사항

* arXiv API: `http://export.arxiv.org/api/query` REST API 사용
* HTML 논문: `https://ar5iv.labs.arxiv.org/html/{arxiv_id}` 활용
* 스크롤 동기화: `IntersectionObserver` + `scrollIntoView` 또는 비율 기반 동기화
* 참고문헌 arXiv 존재 확인: DOI/arXiv ID 추출 후 arXiv API로 검증
* Telegram Bot: BotFather로 봇 생성 → chat_id 기반 메시지 발송

### 보안 고려사항

* API 키 환경변수 관리 (.env)
* CSRF 보호
* SQL Injection 방지 (Prisma ORM 사용으로 기본 방어)
* Rate Limiting (사용자별 요청 제한)
* XSS 방지 (HTML 논문 렌더링 시 sanitize 필수)

---

## 🔹 3단계: Will의 최종 검토

### 완성도 검증

* ✅ 모든 페이지(메인/상세/마이) 요구사항 반영
* ✅ 인증 흐름 (가입 → 관리자 승인 → 이용) 포함
* ✅ 알림 채널 (Telegram + Email) 모두 포함
* ✅ 참고문헌 arXiv 연동 기능 포함

### 보완 사항 추가

* 관리자 대시보드 페이지 필요 (사용자 승인/거부)
* 논문 요약 캐싱 전략 (동일 논문 반복 요약 방지)
* arXiv API Rate Limit 준수 로직
* 모바일 반응형 디자인
* 다크모드 지원

### 실행 전략

* 단계별 구현 권장 (Phase 1~4)
* 각 Phase는 독립적으로 동작 가능하도록 설계

---

## 📋 최종 프롬프트

```markdown
# Arxiv Search - 논문 검색 및 알림 웹 애플리케이션

## 🎯 작업 목표
arXiv 논문을 검색하고, AI가 요약/번역하며, 관심 분야의 신규 논문을 자동으로 감지하여
Telegram/이메일로 알려주는 풀스택 웹 애플리케이션을 구축한다.

## 📋 배경 컨텍스트
- arXiv(arxiv.org)는 물리학, 수학, 컴퓨터과학 등의 프리프린트 논문 저장소이다
- 연구자들이 매일 쏟아지는 논문 중 자신의 관심 분야 논문을 놓치지 않도록 돕는 서비스이다
- 모든 기능은 로그인 및 관리자 승인 후 사용 가능하다
- 논문 본문은 PDF 대신 arXiv의 HTML 버전(ar5iv.labs.arxiv.org)을 활용한다

## 🔧 기술 스택
- **프레임워크**: Next.js 14+ (App Router, TypeScript 5 strict mode)
- **스타일링**: Tailwind CSS 3.4+ + shadcn/ui 컴포넌트
- **DB**: PostgreSQL 16 + Prisma ORM
- **인증**: NextAuth.js v5 (이메일/비밀번호 기반 Credentials Provider)
- **AI**: Anthropic Claude API (claude-sonnet-4-20250514 모델, 요약/번역)
- **스케줄링**: node-cron (서버 사이드 배치 처리)
- **알림**: node-telegram-bot-api + Nodemailer (SMTP)
- **상태 관리**: TanStack Query v5 (서버 상태) + Zustand (클라이언트 상태)
- **배포**: Docker + Docker Compose
- **기타**: Zod (스키마 검증), date-fns (날짜 처리)

## 📝 상세 요구사항

### Phase 1: 인증 및 권한 시스템

#### 1-1. 회원가입 / 로그인
- 이메일 + 비밀번호 기반 Credentials 인증
- 회원가입 시 필수 필드: 이름, 이메일, 비밀번호, 소속기관(선택)
- 비밀번호: bcrypt 해싱, 최소 8자 (영문+숫자+특수문자)
- 가입 후 상태는 `PENDING` → 관리자 승인 시 `APPROVED`
- `PENDING` 상태에서는 로그인은 가능하나 "승인 대기 중" 안내 화면만 표시
- `APPROVED` 상태에서만 모든 기능 접근 가능

#### 1-2. 관리자 대시보드
- 경로: `/admin`
- 관리자 계정은 DB에서 `role: ADMIN`으로 직접 설정 (초기 시드 데이터)
- 가입 요청 목록 조회 (PENDING 상태 사용자)
- 승인/거부 버튼으로 상태 변경
- 전체 사용자 목록 및 상태 관리

#### Prisma 스키마 (User 모델)
```prisma
model User {
  id            String   @id @default(cuid())
  name          String
  email         String   @unique
  password      String   // bcrypt hashed
  institution   String?
  role          Role     @default(USER)
  status        Status   @default(PENDING)
  telegramChatId String?
  alertMethod   AlertMethod @default(EMAIL)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  keywords      UserKeyword[]
  categories    UserCategory[]
  watchedPapers WatchedPaper[]
}

enum Role { USER ADMIN }
enum Status { PENDING APPROVED REJECTED }
enum AlertMethod { EMAIL TELEGRAM BOTH }
```

---

### Phase 2: 메인 페이지 - 논문 검색

#### 2-1. 검색 기능

* 경로: `/` (메인 페이지)
* 검색 입력 필드 + 카테고리 필터 드롭다운
* arXiv API 연동: `http://export.arxiv.org/api/query`
* 검색 쿼리 파라미터:
  * `search_query`: 키워드 (제목/초록/저자 대상)
  * `cat`: 카테고리 필터 (cs.AI, math.CO 등)
  * `start`, `max_results`: 페이지네이션
  * `sortBy`: relevance 또는 submittedDate
  * `sortOrder`: descending
* arXiv API Rate Limit 준수: 요청 간 최소 3초 간격, 서버 사이드에서 쓰로틀링 구현
* XML 응답 파싱: `fast-xml-parser` 사용

#### 2-2. 검색 결과 갤러리

* 카드 그리드 레이아웃 (반응형: 모바일 1열, 태블릿 2열, 데스크탑 3열)
* 각 카드에 표시할 정보:
  * 논문 제목 (2줄 truncate)
  * 저자 목록 (3명 초과 시 "외 N명")
  * 제출일/갱신일
  * 카테고리 배지 (Primary Category)
  * 초록 미리보기 (3줄 truncate)
* 카드 클릭 → 상세 페이지(`/paper/[arxivId]`)로 이동
* 무한 스크롤 또는 "더 보기" 버튼 페이지네이션
* 검색 중 로딩 스켈레톤 UI 표시

#### 서버 사이드 API 라우트

```
GET /api/papers/search?q={query}&cat={category}&page={page}&sort={sortBy}
```

* arXiv API를 서버에서 호출 (CORS 이슈 회피 + Rate Limit 제어)
* 응답을 파싱하여 프론트엔드 친화적 JSON으로 변환
* 타입 정의:

```typescript
interface PaperSummary {
  arxivId: string;        // e.g., "2401.12345"
  title: string;
  authors: string[];
  abstract: string;
  primaryCategory: string;
  categories: string[];
  published: string;      // ISO date
  updated: string;        // ISO date
  htmlUrl: string;        // ar5iv HTML 링크
  pdfUrl: string;         // 원본 PDF 링크 (참고용)
}

interface SearchResponse {
  papers: PaperSummary[];
  totalResults: number;
  startIndex: number;
  itemsPerPage: number;
}
```

---

### Phase 3: 상세 페이지 - AI 요약 및 번역

#### 3-1. 논문 상세 보기

* 경로: `/paper/[arxivId]`
* 상단: 논문 메타데이터 (제목, 저자, 날짜, 카테고리, 원문 링크)
* 본문: ar5iv HTML 콘텐츠를 fetch하여 렌더링
  * URL: `https://ar5iv.labs.arxiv.org/html/{arxivId}`
  * HTML을 서버에서 fetch → sanitize (DOMPurify) → 클라이언트에 전달
  * 수식(MathJax/KaTeX)이 포함될 수 있으므로 KaTeX CSS/JS 로드
* "AI 요약" 버튼: 클릭 시 Claude API로 초록+본문 요약 요청

#### 3-2. AI 요약 기능

* Claude API 호출 (claude-sonnet-4-20250514)
* 시스템 프롬프트:

```
You are a research paper summarizer. Provide a structured summary with:
1. Main Research Question / Objective
2. Methodology
3. Key Findings / Results
4. Significance / Contributions
5. Limitations (if mentioned)
Keep each section to 2-3 sentences. Be precise and technical.
```

* 요약 결과는 DB에 캐싱 (동일 논문 재요약 방지)
* 로딩 중 스트리밍 표시 (streaming response 활용)

#### 3-3. 번역 기능 (1:1 분할 뷰)

* "번역" 버튼 클릭 시:
  * 화면을 수직(vertical) 1:1로 분할
  * **왼쪽** : 원문 (영어)
  * **오른쪽** : 한글 번역
* 번역 단위: 섹션(h2/h3 기준) 또는 단락(p 태그) 단위로 분할하여 번역
* Claude API로 번역 요청 (섹션별 배치 처리)
* **스크롤 동기화 구현** :
* 각 섹션/단락에 매칭 ID 부여 (e.g., `section-1`, `para-3`)
* 왼쪽/오른쪽 패널에 동일 ID로 앵커 설정
* `IntersectionObserver`로 현재 보이는 섹션 감지
* 한쪽 스크롤 시 반대쪽의 대응 섹션으로 `scrollIntoView({ behavior: 'smooth' })`
* 무한 루프 방지: 프로그래밍적 스크롤 중에는 이벤트 핸들러 비활성화 (플래그 사용)
* 번역 결과도 DB에 캐싱

#### 3-4. 참고문헌 섹션

* HTML 본문에서 참고문헌(References) 섹션을 파싱하여 별도 UI 컴포넌트로 분리
* 각 참고문헌에서 arXiv ID 또는 DOI 추출 (정규식 패턴):
  * arXiv ID: `/arxiv[:\s]*(\d{4}\.\d{4,5})/i` 또는 `/abs\/(\d{4}\.\d{4,5})/`
  * DOI: `/10\.\d{4,9}\/[-._;()/:A-Z0-9]+/i`
* 추출된 arXiv ID가 있으면 arXiv API로 존재 확인 → 확인되면 링크 버튼 표시
* 링크 클릭 → 새 탭에서 해당 논문 상세 페이지 열기 (`/paper/[arxivId]`, target="_blank")
* arXiv에 없는 참고문헌은 DOI 링크(doi.org)로 대체, 둘 다 없으면 텍스트만 표시

#### Prisma 스키마 (캐시 모델)

```prisma
model PaperCache {
  id          String   @id @default(cuid())
  arxivId     String   @unique
  title       String
  authors     String   // JSON stringified
  abstract    String
  htmlContent String?  @db.Text
  summary     String?  @db.Text    // AI 요약 캐시
  summaryKo   String?  @db.Text    // AI 요약 한글 번역 캐시
  translatedSections String? @db.Text // JSON: 섹션별 번역 캐시
  references  String?  @db.Text    // JSON: 파싱된 참고문헌
  fetchedAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

---

### Phase 4: 마이페이지 및 알림 시스템

#### 4-1. 관심 분류/키워드 관리

* 경로: `/mypage`
* 카테고리 선택 UI (다중 선택 체크박스):

| 대분류                                     | arXiv 접두사                                                   |
| ------------------------------------------ | -------------------------------------------------------------- |
| Physics                                    | physics, hep-*, astro-ph, cond-mat, gr-qc, nucl-* , quant-ph |
| Mathematics                                | math.*                                                         |
| Computer Science                           | cs.*                                                           |
| Quantitative Biology                       | q-bio.*                                                        |
| Quantitative Finance                       | q-fin.*                                                        |
| Statistics                                 | stat.*                                                         |
| Electrical Engineering and Systems Science | eess.*                                                         |
| Economics                                  | econ.*                                                         |

* 각 대분류 클릭 시 하위 카테고리(sub-category) 목록 펼침 → 세부 선택 가능
* 키워드 관리: 태그 입력 UI (추가/삭제, 최대 20개)
* 알림 설정:
  * 알림 방법: 이메일 / Telegram / 둘 다
  * Telegram 설정: Bot과의 연동 안내 → chat_id 입력/자동 감지
  * 알림 시간: 매일 알림 받을 시간 설정 (기본 09:00 KST)

#### 4-2. 관심 논문 리스트

* 마이페이지 하단에 "관심 논문" 탭
* Cron이 감지한 신규 논문 목록 표시
* 각 항목: 제목, 카테고리, 매칭된 키워드 하이라이트, 등록일
* "읽음" 표시 기능 (읽은 논문은 별도 탭으로 이동)
* 논문 클릭 → 상세 페이지로 이동

#### 4-3. Cron 스케줄링 시스템

* `node-cron`으로 매일 정해진 시간에 실행
* 처리 흐름:

```
1. DB에서 모든 APPROVED 사용자의 카테고리/키워드 조합 수집
2. 중복 제거하여 고유한 검색 쿼리 목록 생성
3. 각 쿼리로 arXiv API Advanced Search 실행
   - 날짜 필터: 최근 7일 이내 submittedDate
   - 쿼리 형식: `cat:{category} AND (all:{keyword1} OR all:{keyword2})`
4. 결과에서 각 사용자의 관심사와 매칭되는 논문 필터링
5. 이미 알림 보낸 논문 제외 (WatchedPaper 테이블 확인)
6. 신규 매칭 논문을 WatchedPaper에 저장
7. 사용자별 alertMethod에 따라 알림 발송
```

* arXiv API Rate Limit: 쿼리 간 3초 대기, 전체 배치 시간 제한 설정
* 에러 발생 시 재시도 로직 (최대 3회, exponential backoff)

#### 4-4. 알림 발송

**Telegram 알림:**

```typescript
// node-telegram-bot-api 사용
const message = `
📚 새로운 관심 논문이 등록되었습니다!

📄 ${paper.title}
👥 ${paper.authors.slice(0, 3).join(', ')}
🏷 ${paper.matchedKeywords.join(', ')}
🔗 ${siteUrl}/paper/${paper.arxivId}
`;
bot.sendMessage(user.telegramChatId, message, { parse_mode: 'Markdown' });
```

**이메일 알림:**

* Nodemailer + SMTP (또는 SendGrid/SES)
* HTML 이메일 템플릿: 논문 목록 + 각 논문 링크 포함
* 일일 다이제스트 형태 (하루에 하나의 이메일로 모든 신규 논문 포함)

#### Prisma 스키마 (알림 관련)

```prisma
model UserCategory {
  id         String @id @default(cuid())
  userId     String
  category   String // e.g., "cs.AI", "math.CO"
  user       User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@unique([userId, category])
}

model UserKeyword {
  id       String @id @default(cuid())
  userId   String
  keyword  String
  user     User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@unique([userId, keyword])
}

model WatchedPaper {
  id            String   @id @default(cuid())
  userId        String
  arxivId       String
  title         String
  matchedKeywords String  // JSON array
  matchedCategory String
  isRead        Boolean  @default(false)
  notifiedAt    DateTime @default(now())
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@unique([userId, arxivId])
  @@index([userId, isRead])
}

model CronLog {
  id          String   @id @default(cuid())
  executedAt  DateTime @default(now())
  queriesRun  Int
  papersFound Int
  alertsSent  Int
  errors      String?  @db.Text
  status      String   // SUCCESS, PARTIAL, FAILED
}
```

---

## ⚠️ 제약사항 및 주의사항

### arXiv API 관련

* Rate Limit: 3초 간격 필수, 위반 시 IP 차단 가능
* API는 Atom XML 형식 반환 → 서버에서 파싱 후 JSON 변환
* ar5iv HTML은 모든 논문에 제공되지 않을 수 있음 → fallback으로 abstract만 표시
* arXiv API는 공식적으로 하루 최대 요청 수를 명시하지 않으나, 보수적으로 운영할 것

### 보안

* HTML 논문 콘텐츠 렌더링 시 반드시 DOMPurify로 sanitize (XSS 방지)
* 사용자 입력 키워드에 특수문자 필터링
* API 키(Claude, Telegram, SMTP)는 환경변수로만 관리
* 관리자 라우트는 미들웨어에서 role 검증 필수

### 성능

* AI 요약/번역 결과는 반드시 DB 캐싱 (동일 논문 반복 API 호출 방지)
* 검색 결과는 TanStack Query로 클라이언트 캐싱 (staleTime: 5분)
* 큰 HTML 콘텐츠는 청크 단위 스트리밍 렌더링 고려
* Cron 작업은 사용자 수에 따라 쿼리 수가 증가하므로 배치 최적화 필수

### 피해야 할 패턴

* ❌ 클라이언트에서 직접 arXiv API 호출 (CORS + Rate Limit 문제)
* ❌ 번역 시 전체 논문을 한 번에 API 호출 (토큰 제한 초과)
* ❌ 스크롤 동기화에서 양방향 이벤트 무한 루프
* ❌ HTML 콘텐츠를 sanitize 없이 dangerouslySetInnerHTML 사용
* ❌ Cron에서 모든 사용자를 순차 처리 (병렬 배치 처리 권장)

---

## 📐 코드 스타일 가이드

### 네이밍 컨벤션

* 컴포넌트: PascalCase (e.g., `PaperCard`, `SearchGallery`)
* 함수/변수: camelCase (e.g., `fetchPapers`, `isLoading`)
* 파일: kebab-case (e.g., `paper-card.tsx`, `use-search.ts`)
* API 라우트: kebab-case (e.g., `/api/papers/search`)
* DB 모델: PascalCase, 필드는 camelCase (Prisma 기본 컨벤션)
* 상수: UPPER_SNAKE_CASE (e.g., `MAX_KEYWORDS`, `ARXIV_API_BASE`)

### 파일 구조

```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── (main)/
│   │   ├── page.tsx                 # 메인 검색 페이지
│   │   └── paper/[arxivId]/page.tsx # 상세 페이지
│   ├── mypage/page.tsx
│   ├── admin/page.tsx
│   ├── api/
│   │   ├── auth/[...nextauth]/route.ts
│   │   ├── papers/
│   │   │   ├── search/route.ts
│   │   │   ├── [arxivId]/route.ts
│   │   │   ├── [arxivId]/summary/route.ts
│   │   │   ├── [arxivId]/translate/route.ts
│   │   │   └── [arxivId]/references/route.ts
│   │   ├── user/
│   │   │   ├── categories/route.ts
│   │   │   ├── keywords/route.ts
│   │   │   └── settings/route.ts
│   │   ├── admin/
│   │   │   └── users/route.ts
│   │   └── cron/
│   │       └── check-papers/route.ts
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── ui/                  # shadcn/ui 컴포넌트
│   ├── search/
│   │   ├── search-bar.tsx
│   │   ├── paper-card.tsx
│   │   └── paper-gallery.tsx
│   ├── paper/
│   │   ├── paper-detail.tsx
│   │   ├── ai-summary.tsx
│   │   ├── translation-view.tsx
│   │   ├── scroll-sync-panel.tsx
│   │   └── references-section.tsx
│   ├── mypage/
│   │   ├── category-selector.tsx
│   │   ├── keyword-manager.tsx
│   │   ├── alert-settings.tsx
│   │   └── watched-papers-list.tsx
│   └── admin/
│       └── user-approval-table.tsx
├── lib/
│   ├── arxiv-api.ts         # arXiv API 클라이언트
│   ├── claude-api.ts        # Claude API 클라이언트
│   ├── telegram.ts          # Telegram Bot 클라이언트
│   ├── mailer.ts            # 이메일 발송
│   ├── html-parser.ts       # ar5iv HTML 파싱/정제
│   ├── prisma.ts            # Prisma 클라이언트 싱글톤
│   ├── auth.ts              # NextAuth 설정
│   └── cron.ts              # Cron 작업 정의
├── hooks/
│   ├── use-search.ts
│   ├── use-paper-detail.ts
│   └── use-scroll-sync.ts
├── types/
│   ├── paper.ts
│   ├── user.ts
│   └── api.ts
└── prisma/
    ├── schema.prisma
    └── seed.ts              # 관리자 초기 데이터
```

### 주석 수준

* 복잡한 비즈니스 로직에만 JSDoc 주석 (모든 함수에 주석 금지)
* 타입으로 자체 문서화 우선
* TODO/FIXME는 이슈 번호와 함께 기록

---

## 🧪 테스트 요구사항

* **단위 테스트** : arXiv API 파싱 로직, 참고문헌 추출 정규식, 검색 쿼리 빌더
* **통합 테스트** : API 라우트 (Mock arXiv/Claude 응답), 인증 흐름
* **E2E 테스트 (선택)** : Playwright로 검색 → 상세 → 요약 흐름
* **테스트 도구** : Vitest + React Testing Library
* **커버리지 목표** : 핵심 비즈니스 로직 80% 이상

---

## 📤 예상 출력 형식

* Next.js App Router 프로젝트 구조
* Docker + Docker Compose 설정 포함 (Next.js + PostgreSQL)
* `.env.example` 파일 (필수 환경변수 목록)
* `README.md` (설치/실행 가이드)
* Prisma 마이그레이션 파일 + seed 스크립트

---

## 💡 참고 구현 패턴

### arXiv API 호출 (서버 사이드)

```typescript
// lib/arxiv-api.ts
const ARXIV_API_BASE = 'http://export.arxiv.org/api/query';
const REQUEST_INTERVAL = 3000; // 3초

let lastRequestTime = 0;

export async function searchArxiv(params: {
  query: string;
  category?: string;
  start?: number;
  maxResults?: number;
  sortBy?: 'relevance' | 'submittedDate';
}): Promise<SearchResponse> {
  // Rate limiting
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < REQUEST_INTERVAL) {
    await new Promise(resolve => setTimeout(resolve, REQUEST_INTERVAL - elapsed));
  }
  lastRequestTime = Date.now();

  const searchQuery = params.category
    ? `cat:${params.category} AND all:${params.query}`
    : `all:${params.query}`;

  const url = new URL(ARXIV_API_BASE);
  url.searchParams.set('search_query', searchQuery);
  url.searchParams.set('start', String(params.start ?? 0));
  url.searchParams.set('max_results', String(params.maxResults ?? 20));
  url.searchParams.set('sortBy', params.sortBy ?? 'submittedDate');
  url.searchParams.set('sortOrder', 'descending');

  const response = await fetch(url.toString());
  const xml = await response.text();
  return parseArxivResponse(xml);
}
```

### 스크롤 동기화 훅

```typescript
// hooks/use-scroll-sync.ts
export function useScrollSync(leftRef: RefObject<HTMLElement>, rightRef: RefObject<HTMLElement>) {
  const isSyncing = useRef(false);

  useEffect(() => {
    const left = leftRef.current;
    const right = rightRef.current;
    if (!left || !right) return;

    const syncScroll = (source: HTMLElement, target: HTMLElement) => {
      if (isSyncing.current) return;
      isSyncing.current = true;

      const ratio = source.scrollTop / (source.scrollHeight - source.clientHeight);
      target.scrollTop = ratio * (target.scrollHeight - target.clientHeight);

      requestAnimationFrame(() => { isSyncing.current = false; });
    };

    const onLeftScroll = () => syncScroll(left, right);
    const onRightScroll = () => syncScroll(right, left);

    left.addEventListener('scroll', onLeftScroll);
    right.addEventListener('scroll', onRightScroll);

    return () => {
      left.removeEventListener('scroll', onLeftScroll);
      right.removeEventListener('scroll', onRightScroll);
    };
  }, [leftRef, rightRef]);
}
```

### 환경변수 (.env.example)

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/arxiv_search

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key

# Claude API
ANTHROPIC_API_KEY=sk-ant-xxxxx

# Telegram
TELEGRAM_BOT_TOKEN=123456:ABC-xxxxx

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@arxiv-search.com

# App
NEXT_PUBLIC_SITE_URL=http://localhost:3000
CRON_SECRET=your-cron-secret  # Cron API 인증용
```

```

---

> 🔹 **Will의 최종 코멘트**: 이 프롬프트는 4개의 Phase로 구분되어 있으므로, 코딩 AI에게 "Phase 1부터 순서대로 구현해주세요"라고 지시하면 단계적으로 완성도 높은 결과를 얻을 수 있습니다. 각 Phase가 독립적으로 동작하도록 설계되었으니, Phase 1 완성 후 테스트 → Phase 2 진행 순서를 권장합니다.

작업 후에는 git 을 이용하여 커밋 및 push 
```
