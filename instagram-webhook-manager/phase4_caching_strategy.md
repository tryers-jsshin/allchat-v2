# Phase 4: Caching Strategy

## Overview
성능 최적화를 위한 다층 캐싱 전략

## 1. Database Level Caching

### Materialized View
- **대상**: `conversations_with_profiles`
- **갱신 주기**: 트리거 기반 (2초 디바운싱)
- **이점**: JOIN 연산 사전 계산으로 50-70% 성능 향상

### Function Result Caching
- **대상**: `get_conversation_status_counts()`
- **캐시 방식**: PostgreSQL `STABLE` 함수 선언
- **이점**: 동일 트랜잭션 내 결과 재사용

## 2. API Level Caching

### Next.js Cache
```typescript
// 상태 카운트 캐싱 (5초)
export async function GET(request: NextRequest) {
  return NextResponse.json(counts, {
    headers: {
      'Cache-Control': 'public, s-maxage=5, stale-while-revalidate'
    }
  })
}
```

### React Query (클라이언트)
```typescript
// ConversationsList.tsx
const { data: conversations } = useQuery({
  queryKey: ['conversations', platform, status],
  queryFn: fetchConversations,
  staleTime: 10000, // 10초
  cacheTime: 300000, // 5분
})
```

## 3. Edge Caching (Production)

### Vercel Edge Cache
- Static assets: Permanent
- API routes: 5-10초 캐싱
- Revalidation: On-demand 또는 시간 기반

### CDN Configuration
```javascript
// next.config.js
module.exports = {
  headers: async () => [
    {
      source: '/api/conversations',
      headers: [
        {
          key: 'Cache-Control',
          value: 'public, s-maxage=10, stale-while-revalidate=59'
        }
      ]
    }
  ]
}
```

## 4. Application State Caching

### Zustand Store (권장)
```typescript
const useConversationStore = create((set) => ({
  conversations: [],
  statusCounts: {},
  lastFetch: null,
  
  fetchConversations: async () => {
    // 5초 내 재요청 방지
    if (Date.now() - lastFetch < 5000) return
    // ... fetch logic
  }
}))
```

## 5. 캐시 무효화 전략

### Event-based Invalidation
- Webhook 수신 시 → 해당 대화만 업데이트
- 상태 변경 시 → 카운트만 갱신
- 프로필 업데이트 시 → 관련 대화만 갱신

### Time-based Invalidation
- 대화 목록: 10초
- 상태 카운트: 5초  
- 프로필 정보: 1시간
- 메시지: 실시간 (캐싱 없음)

## 6. 성능 목표

| 메트릭 | 현재 | 목표 | 달성 방법 |
|--------|------|------|----------|
| 대화 목록 로드 | 775ms | < 200ms | Materialized View |
| 상태 카운트 | 300ms | < 50ms | PostgreSQL Function |
| 프로필 조회 | 개별 조회 | 일괄 조회 | JOIN 최적화 |
| 메시지 로드 | 400ms | < 200ms | 인덱스 최적화 |

## 7. 모니터링

### Key Metrics
- Cache hit ratio
- Query execution time  
- API response time
- Database connection pool

### Tools
- Supabase Dashboard
- Vercel Analytics
- Custom logging

## 8. Best Practices

1. **Selective Caching**: 자주 변경되지 않는 데이터만 캐싱
2. **Cache Warming**: 초기 로드 시 주요 데이터 프리페칭
3. **Progressive Loading**: 중요한 데이터 먼저, 상세 정보는 나중에
4. **Optimistic Updates**: UI 즉시 업데이트, 서버 응답으로 확정
5. **Graceful Degradation**: 캐시 실패 시 폴백 전략

## 9. Implementation Checklist

- [x] Database indexes 최적화
- [x] Materialized View 구현
- [x] Status count function 최적화
- [ ] React Query 도입
- [ ] Zustand store 구현
- [ ] Edge caching 설정
- [ ] Monitoring dashboard 구축