# 북숭아

매달 취향에 맞는 책 한 권을 골라 배송하는 서비스의 랜딩 페이지입니다.
장르와 독서 느낌을 고른 다음 계좌 안내를 확인하고, 이체 후 배송지와 입금자명을 제출합니다.

## 로컬 미리보기

```sh
python3 -m http.server 4173 --bind 127.0.0.1 --directory public
```

http://127.0.0.1:4173 에서 확인할 수 있습니다. Vercel 함수를 포함해 실행하려면 Vercel CLI 인증 후 `npx vercel dev`를 사용합니다.

## Vercel

GitHub의 `sungbin38/Booksunga`를 Import 합니다. 루트 디렉터리는 저장소 루트, 프레임워크는 Other입니다. 정적 출력 경로는 `vercel.json`에 지정되어 있습니다.

## 계좌이체 신청 활성화

다음 서버 환경변수를 설정하고 재배포하면 첫 달 계좌 안내와 배송 신청이 활성화됩니다.

| 변수 | 설정 |
| --- | --- |
| BOOKSUNGA_PRICE | 배송비를 포함한 첫 달 정수 원화 금액 |
| BOOKSUNGA_BANK | 은행명 |
| BOOKSUNGA_ACCOUNT | 계좌번호 |
| BOOKSUNGA_HOLDER | 예금주 |
| BOOKSUNGA_ORDER_URL | 신청을 영구 저장하는 운영자 HTTPS 엔드포인트 |
| BOOKSUNGA_ORDER_TOKEN | 접수 엔드포인트의 Bearer 인증 토큰 |

접수 엔드포인트는 JSON으로 접수번호(id), 취향(genres, mood), 배송 정보(name, phone, address), 입금자명(depositor), 금액(amount), 상태(status), 시각(createdAt)을 받습니다. 주문 저장이 끝나면 2xx를 반환해야 접수 완료를 표시합니다. 운영자는 실제 입금을 확인하고 고객에게 안내합니다. 설정이 없으면 설문 결과와 계좌이체 준비 안내가 표시됩니다.

첫 달 수동 접수까지 구현되어 있습니다. 이후 월별 갱신, 배송 일정, 교환·환불 및 개인정보 처리 조건은 판매 전에 확정해야 합니다.

디자인 참고는 Heywood Hill의 맞춤 선서 과정과 Book of the Month의 구독 소개 및 행동 유도 방식입니다.
