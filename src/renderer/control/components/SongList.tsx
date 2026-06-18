import { useState } from 'react'
import { useAppStore } from '../store'

export function SongList() {
  const songs = useAppStore((s) => s.songs)
  const loadSong = useAppStore((s) => s.loadSong)
  const presentationState = useAppStore((s) => s.presentationState)
  const [search, setSearch] = useState('')

  const filtered = songs.filter((s) =>
    s.title.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <input
        type="text"
        placeholder="Search songs…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{
          padding: '8px',
          margin: '8px',
          borderRadius: '4px',
          border: '1px solid #444',
          background: '#1a1a1a',
          color: '#fff'
        }}
      />
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {filtered.map((song) => (
          <div
            key={song.id}
            onClick={() => loadSong(song.id)}
            style={{
              padding: '10px 12px',
              cursor: 'pointer',
              background: presentationState?.activeSongId === song.id ? '#2a4a7f' : 'transparent',
              borderBottom: '1px solid #2a2a2a',
              color: '#fff'
            }}
          >
            <div style={{ fontWeight: 500 }}>{song.title}</div>
            {song.mood.length > 0 && (
              <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>
                {song.mood.join(', ')}
              </div>
            )}
          </div>
        ))}
        {filtered.length === 0 && (
          <div style={{ padding: '12px', color: '#666', textAlign: 'center' }}>
            No songs found
          </div>
        )}
      </div>
    </div>
  )
}
