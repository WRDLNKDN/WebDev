/**
 * @vitest-environment jsdom
 */
(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

import { act, createRef } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { DashboardLinksSection } from '../../pages/dashboard/dashboardLinksSection';
import { DashboardPortfolioSection } from '../../pages/dashboard/dashboardPortfolioSection';

describe('Dashboard CTA simplification', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('keeps one explicit primary action in the empty links section', async () => {
    await act(async () => {
      root.render(
        <DashboardLinksSection
          loading={false}
          socials={[]}
          onOpenLinks={() => {}}
        />,
      );
    });

    const buttons = Array.from(container.querySelectorAll('button'));

    expect(buttons).toHaveLength(1);
    expect(buttons[0]?.getAttribute('aria-label')).toBe('Add link');
    expect(buttons[0]?.textContent).toContain('Add Link');
    expect(container.textContent).not.toContain('Add a link');
  });

  it('keeps one explicit dropdown action in the empty portfolio section', async () => {
    await act(async () => {
      root.render(
        <DashboardPortfolioSection
          loading={false}
          projects={[]}
          resumeUrl={null}
          resumeFileName={null}
          resumeThumbnailUrl={null}
          resumeThumbnailStatus={null}
          resumeThumbnailError={null}
          resumeDisplayIndex={0}
          addMenuAnchor={null}
          resumeFileInputRef={createRef<HTMLInputElement>()}
          updating={false}
          onOpenAddMenu={() => {}}
          onCloseAddMenu={() => {}}
          onOpenResumePicker={() => {}}
          onOpenNewProjectDialog={() => {}}
          onResumeInputChange={() => {}}
          onResumeUpload={async () => {}}
          onEditReplaceResume={async () => {}}
          onEditUploadResumeThumbnail={async () => {}}
          onEditRegenerateResumeThumbnail={async () => {}}
          onRetryThumbnail={async () => {}}
          onDeleteResume={async () => {}}
          onReorder={async () => {}}
          onDeleteProject={async () => {}}
          onToggleHighlight={async () => {}}
          onEditProject={() => {}}
          onOpenPreview={() => {}}
        />,
      );
    });

    const buttons = Array.from(container.querySelectorAll('button'));

    expect(buttons).toHaveLength(1);
    expect(buttons[0]?.getAttribute('aria-label')).toBe('Add to portfolio');
    expect(buttons[0]?.textContent).toContain('Add to Portfolio');
    expect(buttons[0]?.textContent?.trim()).not.toBe('Add');
  });
});
