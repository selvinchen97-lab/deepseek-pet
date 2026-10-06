/**
 * Client half of @local/dsh-pet-balance: one floating desktop pet in the
 * frame-wide overlay showing the signed-in account's recharge and bonus
 * balances.
 *
 * Balances come from the account Remote namespace, the same Host service the
 * Settings > Account page reads, so this plugin needs no Host half of its own.
 */
window.__ModuleLoader__.load({
  id: '@local/dsh-pet-balance',
  factory(require) {
    const React = require('react');
    const h = React.createElement;

    /** Inlined pet artwork: a coverage mask, tinted by the theme at render. */
    const PET = "data:image/png;base64,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";

    const POSITION_KEY = 'dsh-pet-balance:position';
    const COLLAPSED_KEY = 'dsh-pet-balance:collapsed';
    const REFRESH_MS = 10 * 60 * 1000;
    const SIZE = 140;
    /** Pointer travel below this still counts as a click, not a drag. */
    const DRAG_SLOP = 5;

    /** Read one persisted value, tolerating absent or blocked storage. */
    function readStored(key) {
      try {
        return window.localStorage.getItem(key);
      } catch (error) {
        return null;
      }
    }

    /** Persist one value, tolerating absent or blocked storage. */
    function writeStored(key, value) {
      try {
        window.localStorage.setItem(key, value);
      } catch (error) {
        /* storage is optional: the pet still works, it just forgets. */
      }
    }

    /** Clamp a number into an inclusive range. */
    function clamp(value, min, max) {
      return Math.min(Math.max(value, min), max);
    }

    /** Default seat: bottom-right, clear of the window edges. */
    function defaultPosition() {
      const width = typeof window === 'undefined' ? 1280 : window.innerWidth;
      const height = typeof window === 'undefined' ? 800 : window.innerHeight;
      return { x: Math.max(12, width - SIZE - 24), y: Math.max(12, height - SIZE - 88) };
    }

    /** Restore the saved seat, falling back to the default one. */
    function readPosition() {
      const raw = readStored(POSITION_KEY);
      if (raw !== null) {
        try {
          const parsed = JSON.parse(raw);
          if (Number.isFinite(parsed?.x) && Number.isFinite(parsed?.y)) return { x: parsed.x, y: parsed.y };
        } catch (error) {
          /* a corrupt seat falls back to the default. */
        }
      }
      return defaultPosition();
    }

    /** Keep the pet inside the current viewport. */
    function fitPosition(position) {
      const width = typeof window === 'undefined' ? 1280 : window.innerWidth;
      const height = typeof window === 'undefined' ? 800 : window.innerHeight;
      return {
        x: clamp(position.x, 8, Math.max(8, width - SIZE - 8)),
        y: clamp(position.y, 8, Math.max(8, height - SIZE - 8)),
      };
    }

    /**
     * Format one wallet amount to two decimals.
     * @param value - decimal string exactly as Platform reports it.
     * @param currency - wallet currency code.
     * @returns the amount with its symbol, or an em dash when unparsable.
     */
    function formatAmount(value, currency) {
      const symbol = currency === 'USD' ? '$' : '\u00a5';
      const amount = Number(String(value ?? '').trim());
      if (!Number.isFinite(amount)) return '\u2014';
      return symbol + Math.abs(amount).toFixed(2);
    }

    /** Whether one wallet carries a non-zero amount. */
    function hasValue(wallet) {
      const parsed = Number(wallet?.balance);
      return Number.isFinite(parsed) ? parsed !== 0 : String(wallet?.balance ?? '').trim() !== '';
    }

    /**
     * Read the current account balances.
     * @returns a resolved balance state for rendering, never a rejected promise.
     */
    async function loadBalance(remote) {
      if (!remote || !remote.account) return { status: 'error', message: '账号服务不可用' };
      try {
        const result = await remote.account.getBalance({
          version: '1.0.0',
          locale: typeof navigator === 'undefined' ? 'zh' : navigator.language || 'zh',
          timezoneOffsetSeconds: -new Date().getTimezoneOffset() * 60,
        });
        if (!result || result.ok !== true) return { status: 'error', message: '余额读取失败' };
        if (result.value === null || result.value === undefined) return { status: 'signed-out' };
        return { status: 'ready', value: result.value };
      } catch (error) {
        return { status: 'error', message: '余额读取失败' };
      }
    }

    const CSS = [
      /* shell.overlay is click-through: opt this occupant back into pointer events. */
      '.dshp-root{position:fixed;z-index:60;width:140px;display:flex;flex-direction:column;align-items:flex-end;',
      'gap:4px;user-select:none;font-family:inherit;pointer-events:none;}',
      /* The artwork is a coverage mask painted with the theme's text colour, so
         one asset is legible on both a light and a dark page. The resting
         transform is none, so the click pulse cannot grow the pet. */
      '.dshp-pet{width:140px;height:auto;aspect-ratio:375/306;cursor:pointer;touch-action:none;display:block;',
      'pointer-events:auto;transform:none;transition:transform .12s ease-out;',
      'background-color:var(--dsw-alias-label-primary);',
      '-webkit-mask-repeat:no-repeat;-webkit-mask-position:center;-webkit-mask-size:contain;',
      'mask-repeat:no-repeat;mask-position:center;mask-size:contain;',
      'mask-image:var(--dshp-art);-webkit-mask-image:var(--dshp-art);',
      'filter:drop-shadow(0 3px 6px rgba(0,0,0,.25));}',
      '.dshp-pet.dshp-dragging{cursor:grabbing;}',
      '.dshp-pet.dshp-pulse{transform:scale(1.04);}',
      '@media (prefers-reduced-motion:reduce){.dshp-pet{transition:none}.dshp-pet.dshp-pulse{transform:none}}',
      '.dshp-bubble{pointer-events:auto;min-width:140px;box-sizing:border-box;padding:7px 9px;',
      'border-radius:11px;background:var(--dsw-alias-bg-overlay);color:var(--dsw-alias-label-primary);',
      'border:1px solid var(--dsw-alias-border-l1);box-shadow:0 6px 16px rgba(0,0,0,.18);',
      'font-size:12px;line-height:1.45;}',
      '.dshp-collapsed .dshp-bubble{display:none;}',
      '.dshp-row{display:flex;align-items:baseline;justify-content:space-between;gap:10px;}',
      '.dshp-key{color:var(--dsw-alias-label-secondary);font-size:11px;}',
      '.dshp-val{font-variant-numeric:tabular-nums;font-weight:600;letter-spacing:.02em;}',
      '.dshp-bonus{color:var(--dsw-alias-brand-primary);}',
      '.dshp-empty{color:var(--dsw-alias-label-secondary);font-size:11px;}',
      '.dshp-pending{opacity:.55;}',
    ].join('');

    /** The floating desktop pet. */
    function PetBalance(props) {
      const remote = props.remote;
      const [position, setPosition] = React.useState(readPosition);
      const [collapsed, setCollapsed] = React.useState(() => readStored(COLLAPSED_KEY) === '1');
      const [balance, setBalance] = React.useState({ status: 'loading' });
      const [pending, setPending] = React.useState(false);
      const [pulse, setPulse] = React.useState(false);
      const [dragging, setDragging] = React.useState(false);

      const reload = React.useCallback(async () => {
        setPending(true);
        setPulse(true);
        window.setTimeout(() => setPulse(false), 140);
        setBalance(await loadBalance(remote));
        setPending(false);
      }, [remote]);

      React.useEffect(() => {
        let cancelled = false;
        const refresh = async () => {
          if (cancelled) return;
          const next = await loadBalance(remote);
          if (!cancelled) setBalance(next);
        };
        refresh();
        const timer = window.setInterval(refresh, REFRESH_MS);
        window.addEventListener('focus', refresh);
        return () => {
          cancelled = true;
          window.clearInterval(timer);
          window.removeEventListener('focus', refresh);
        };
      }, [remote]);

      React.useEffect(() => {
        const onResize = () => setPosition((current) => fitPosition(current));
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
      }, []);

      /* A press either drags the pet or refreshes the balance on release. */
      const onPointerDown = (event) => {
        if (event.button !== 0) return;
        event.preventDefault();
        const origin = { x: event.clientX, y: event.clientY };
        const base = position;
        let moved = false;
        setDragging(true);
        const onMove = (moveEvent) => {
          const travel = Math.abs(moveEvent.clientX - origin.x) + Math.abs(moveEvent.clientY - origin.y);
          if (!moved && travel <= DRAG_SLOP) return;
          moved = true;
          setPosition(fitPosition({
            x: base.x + (moveEvent.clientX - origin.x),
            y: base.y + (moveEvent.clientY - origin.y),
          }));
        };
        const onUp = () => {
          window.removeEventListener('pointermove', onMove);
          window.removeEventListener('pointerup', onUp);
          setDragging(false);
          if (moved) {
            setPosition((current) => {
              writeStored(POSITION_KEY, JSON.stringify(current));
              return current;
            });
            return;
          }
          void reload();
        };
        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
      };

      /* Double-clicking the bubble only collapses it, so a refresh stays a
         deliberate single click on the pet. */
      const onBubbleDoubleClick = () => {
        setCollapsed((current) => {
          const next = !current;
          writeStored(COLLAPSED_KEY, next ? '1' : '0');
          return next;
        });
      };

      const wallets = balance.status === 'ready' ? balance.value.value.filter(hasValue) : [];
      const bonusWallets = balance.status === 'ready' ? balance.value.bonusWallets.filter(hasValue) : [];
      const recharge = wallets.length > 0
        ? wallets.map((wallet) => formatAmount(wallet.balance, wallet.currency)).join(' / ')
        : '\u00a50.00';
      const bonus = bonusWallets.length > 0
        ? bonusWallets.map((wallet) => formatAmount(wallet.balance, wallet.currency)).join(' / ')
        : '\u2014';

      const body = [];
      if (balance.status === 'loading') {
        body.push(h('div', { key: 'loading', className: 'dshp-empty' }, '读取中…'));
      } else if (balance.status === 'signed-out') {
        body.push(h('div', { key: 'out', className: 'dshp-empty' }, '未登录'));
      } else if (balance.status === 'error') {
        body.push(h('div', { key: 'err', className: 'dshp-empty' }, balance.message));
      } else {
        body.push(h('div', { key: 'recharge', className: 'dshp-row' }, [
          h('span', { key: 'k', className: 'dshp-key' }, '充值'),
          h('span', { key: 'v', className: 'dshp-val' }, recharge),
        ]));
        body.push(h('div', { key: 'bonus', className: 'dshp-row' }, [
          h('span', { key: 'k', className: 'dshp-key' }, '赠金'),
          h('span', { key: 'v', className: 'dshp-val dshp-bonus' }, bonus),
        ]));
      }

      const petClass = 'dshp-pet'
        + (dragging ? ' dshp-dragging' : '')
        + (pulse ? ' dshp-pulse' : '');

      return h('div', {
        className: 'dshp-root' + (collapsed ? ' dshp-collapsed' : ''),
        style: { left: position.x + 'px', top: position.y + 'px' },
      }, [
        h('style', { key: 'css' }, CSS),
        h('div', {
          key: 'bubble',
          className: 'dshp-bubble' + (pending ? ' dshp-pending' : ''),
          role: 'status',
          title: '双击收起／展开',
          onDoubleClick: onBubbleDoubleClick,
        }, body),
        h('div', {
          key: 'pet',
          className: petClass,
          role: 'img',
          'aria-label': '余额宠物',
          title: '单击刷新余额，拖动可移动',
          style: { WebkitMaskImage: 'url("' + PET + '")', maskImage: 'url("' + PET + '")' },
          onPointerDown,
        }),
      ]);
    }

    return {
      inject: ['slots', 'remote', 'remote.account'],
      apply(ctx) {
        /** The Client-facing account Remote namespace this pet reads. */
        const remote = ctx.remote;
        ctx.slots.inject('shell.overlay', () => ctx.slots.register({
          name: 'shell.overlay',
          id: 'pet-balance',
          order: 60,
          label: '余额',
        }, (props) => h(PetBalance, { ...props, remote })));
      },
    };
  },
});
