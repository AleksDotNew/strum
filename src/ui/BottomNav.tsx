export type Tab = 'code' | 'grid' | 'sounds' | 'mix'

export interface BottomNavProps {
  currentTab: Tab
  onSelectTab(tab: Tab): void
}

const TABS: { id: Tab; label: string }[] = [
  { id: 'code', label: 'Код' },
  { id: 'grid', label: 'Сетка' },
  { id: 'sounds', label: 'Звуки' },
  { id: 'mix', label: 'Микс' },
]

export function BottomNav(props: BottomNavProps) {
  return (
    <nav class="bottomnav" aria-label="Панель навигации">
      <div role="tablist" style={{ display: 'flex', width: '100%' }}>
        {TABS.map((tab) => (
          <button
            role="tab"
            aria-selected={props.currentTab === tab.id}
            onClick={() => props.onSelectTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </nav>
  )
}
