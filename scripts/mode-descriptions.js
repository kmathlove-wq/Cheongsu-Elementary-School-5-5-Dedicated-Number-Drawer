const DEFAULT_POOL_TEXTS = {
  basic: '1번부터 26번까지 중 랜덤 번호를 뽑습니다. 19번은 제외됩니다.',
  teacher: '선생님 + 1번~26번 중 랜덤으로 뽑습니다. 19번은 제외됩니다.',
  'teacher-mystery': '선생님 + 1번~26번 중 뽑습니다. 19번 제외. 선생님에겐 조금 특별한 무언가가 있을지도...?',
  'twenty-six': '1번~26번 중 뽑습니다. 19번 제외. 26번에겐 조금 특별한 무언가가 있을지도...? 그리고, 26번이 나오면...?',
  manitto: '마니또 모드: 자기 자신이 나오지 않도록 전체를 섞어 서로 한 명씩 비밀 친구를 배정합니다.',
  gumball: '공 뽑기 모드: 통 안의 공들이 돌아가다가 무작위로 하나가 나옵니다.',
  wheel: '돌림판 모드: 원판이 돌다가 화살표가 가리키는 번호가 뽑힙니다.',
  pinball: '핀볼! 공이 번호 범퍼를 튕기다가 선택된 번호가 뽑힙니다.',
  'pinball-teacher': '핀볼(선생님) 모드: 선생님 공 포함! 선생님이 당첨될 수도?',
  'song-pinball': '노래추첨 핀볼 모드: 당첨 번호가 듣고 싶은 노래를 입력하면 YouTube에서 찾아 재생합니다.',
  'eleven-song-pinball': '11번 노래추첨 핀볼 모드: 모든 항목이 11번이며, 11번이 듣고 싶은 노래를 찾아 재생합니다.',
  'nine-song-pinball': '9번 노래추첨 핀볼 모드: 모든 항목이 9번이며, 9번이 듣고 싶은 노래를 찾아 재생합니다.',
};

export function getModeDescription({
  mode,
  label,
  isDefaultPool,
  itemCount,
  hasForced,
  hasBlocked,
  hasTeacher,
  hasTodayNumber,
  hasTwentySix,
  isPinball,
  isManitto,
  todayNumber,
}) {

  if (!isDefaultPool) {

    let text = `${label} 모드: 관리자 설정 항목 ${itemCount}개 중 뽑습니다.`;

    if (!isManitto && hasForced) {
      text += ' 무조건 뽑힘 항목이 적용됩니다.';
    }

    if (!isPinball && hasBlocked) {
      text += ' 제외 항목은 뽑지 않습니다.';
    }

    if (mode === 'teacher-mystery' && hasTeacher) {
      text += ' 선생님은 남아있으면 무조건 포함됩니다.';
    }

    if (mode === 'mystery' && hasTodayNumber) {
      text += ` 단, ${todayNumber}번이 나오면...?`;
    }

    if (mode === 'twenty-six' && hasTwentySix) {
      text += ' 단, 26번이 나오면...?';
    }

    if (isPinball) {
      text += ' 핀볼 방식으로 진행됩니다.';
    }

    if (isManitto) {
      text += ' 자기 자신을 제외하고 서로 한 명씩 비밀 친구를 배정합니다.';
    }

    return text;
  }

  return DEFAULT_POOL_TEXTS[mode] ||
    `1번~26번 중 랜덤 번호를 뽑습니다. 19번 제외. 단, ${todayNumber}번이 나오면...?`;
}
