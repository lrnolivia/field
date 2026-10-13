const IMG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAFAAAAAyCAIAAABET8urAAAAcklEQVR4nOXOMQHAMBCAQIqWeoqK+orFbHWRHzgD8Jy9mfC9a6QrMRIjMRIjMRIjMRIjMRIjMRIjMRIjMRIjMRIjMRIjMRIjMRIjMRIjMRIjMRIjMRIjMRIjMRIjMRIjMRIjMRIjMRIjMRIjMRLj9MBtPy+eA5U8gxfjAAAAAElFTkSuQmCC';

export const project = {
  format: 'revyme-v1' as const,
  files: {
    'app/page.tsx': `import PageClient from './page.client';
export const metadata = {};
export default function Page() { return <PageClient />; }`,
    'app/page.client.tsx': `/** @canvas { "viewports": [{"id":"desktop","width":1280}] } */
'use client';
import Card from '../components/Card';
import FilmGrain from '../components/FilmGrain';
import team from '@/cms/team.json';
import { useState } from 'react';

const IMG = '${IMG}';

export default function Page() {
  const [overlayOpen, setOverlayOpen] = useState(true);
  return (
    <div data-id="root" data-name="Page" style={{
      width: '1280px', minHeight: '1500px', background: '#161616',
      display: 'flex', flexDirection: 'column', gap: '28px', padding: '40px',
      color: '#f4f4f4',
    }}>
      <div data-id="box" data-name="Plain frame" style={{
        width: '500px', height: '140px', background: '#242424',
        border: '1px solid #555', borderRadius: '14px', boxShadow: '0 10px 28px rgba(0,0,0,.28)',
      }} />

      <div data-id="frame" data-name="Auto frame" style={{
        width: '720px', minHeight: '220px', background: '#20252a',
        display: 'flex', flexDirection: 'column', gap: '16px', padding: '24px',
        borderRadius: '18px', overflow: 'hidden',
      }}>
        <p data-id="text" data-name="Headline" style={{
          margin: 0, color: '#f3efe7', fontSize: '38px', fontWeight: 650,
          lineHeight: '1.08', letterSpacing: '-0.02em',
        }}>field inspector visual QA</p>
        <p data-id="body" data-name="Body" style={{
          margin: 0, color: '#aeb6be', fontSize: '15px', lineHeight: '1.5',
        }}>A compact node used to verify typography, fills, layout, effects and card rhythm.</p>
      </div>

      <img data-id="image" data-name="Image" src={IMG} alt="" style={{
        width: '360px', height: '225px', objectFit: 'cover', borderRadius: '16px',
        border: '2px solid #6d7680',
      }} />

      <svg data-id="svg" data-name="Vector" viewBox="0 0 160 100" style={{
        width: '320px', height: '200px', color: '#ffb86b', display: 'block',
      }}>
        <path d="M10 80 L80 10 L150 80 Z" fill="currentColor" stroke="#fff" strokeWidth="4" />
      </svg>

      <Card data-id="component" title="Design component" accent="#75d7c7" />
      <FilmGrain data-id="code-component" intensity={0.62} accentColor="#f79d84" />

      <video data-id="video" data-name="Video" controls style={{
        width: '420px', height: '236px', background: '#111', borderRadius: '12px',
      }} />

      <audio data-id="audio" data-name="Audio" controls style={{
        width: '420px',
      }} />

      <form data-id="form" data-name="Form" action="/submit" method="post" style={{
        width: '420px', padding: '18px', display: 'flex', flexDirection: 'column',
        gap: '12px', border: '1px solid #555', borderRadius: '12px',
      }}>
        <input data-id="input" data-name="Input" name="email" type="email"
          placeholder="name@example.com" required style={{
            height: '38px', padding: '0 10px', background: '#202020', color: '#fff',
            border: '1px solid #555', borderRadius: '8px',
          }} />
      </form>

      <a data-id="link" data-name="Link" href="#target" style={{
        color: '#8ac7ff', fontSize: '16px', textDecoration: 'underline',
      }}>Navigation link</a>
      <div data-id="target" data-name="Target" style={{ height: '20px' }} />

      <div data-id="collection-list" data-name="Collection list" data-collection-list="team" style={{
        width: '420px', padding: '14px', display: 'flex', flexDirection: 'column',
        gap: '10px', background: '#202020', borderRadius: '12px',
      }}>
        {team.map((item, idx) => (
          <div data-id="collection-row" data-name="Row" key={idx} style={{
            minHeight: '44px', padding: '10px', background: '#2b2b2b', borderRadius: '8px',
          }}>
            <p data-id="collection-name" style={{ margin: 0, color: '#fff' }}>{item.name}</p>
          </div>
        ))}
      </div>

      <button data-id="overlay-trigger" data-name="Overlay trigger"
        data-overlay-trigger='{"trigger":"click"}'
        onClick={() => setOverlayOpen(!overlayOpen)}
        style={{ width: '180px', height: '40px' }}>Overlay trigger</button>
      {overlayOpen && (
        <div data-id="overlay" data-name="Overlay"
          data-overlay='{"type":"relative","triggerId":"overlay-trigger","side":"bottom","align":"center","offsetX":0,"offsetY":8}'
          style={{
            position: 'absolute', width: '240px', height: '120px',
            background: '#27323a', border: '1px solid #6688aa', borderRadius: '12px',
          }} />
      )}
    </div>
  );
}`,
    'components/Card.tsx': `'use client';
/** @pageVariables { "variables": [
  { "name":"title","type":"text","default":"Design component" },
  { "name":"accent","type":"color","default":"#75d7c7" }
] } */
export default function Card({ title = 'Design component', accent = '#75d7c7', ...props }: any) {
  return (
    <div {...props} style={{
      width: '420px', minHeight: '130px', padding: '22px',
      display: 'flex', flexDirection: 'column', gap: '8px',
      borderRadius: '16px', border: '1px solid ' + accent,
      background: '#202020', color: '#fff',
    }}>
      <strong style={{ color: accent, fontSize: '18px' }}>{title}</strong>
      <span style={{ color: '#a6a6a6', fontSize: '13px' }}>Component instance properties</span>
    </div>
  );
}`,
    'cms/team.schema.json': '{"slug":"team","name":"Team","fields":[{"id":"name","name":"Name","type":"text"}]}',
    'cms/team.json': '[{"_id":"1","_slug":"one","_status":"published","name":"Ada"},{"_id":"2","_slug":"two","_status":"published","name":"Grace"}]',
    'components/FilmGrain.tsx': `'use client';
/** @controls {
  "intensity": { "type":"slider", "label":"Intensity", "default":0.5, "min":0, "max":1, "step":0.01 },
  "accentColor": { "type":"color", "label":"Accent Color", "default":"#f79d84" },
  "enabled": { "type":"toggle", "label":"Enabled", "default":true }
} */
export default function FilmGrain({ intensity = 0.5, accentColor = '#f79d84', enabled = true, ...props }: any) {
  return (
    <div {...props} style={{
      width: '420px', minHeight: '120px', padding: '20px',
      borderRadius: '16px', border: '1px solid #555',
      background: enabled ? '#252525' : '#1d1d1d',
      color: accentColor, opacity: 0.65 + Number(intensity) * 0.35,
    }}>Code component</div>
  );
}`,
  },
};

