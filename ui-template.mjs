/**
 * UI half of the desktop pet, kept as a template so the bundle can be rebuilt
 * after the artwork changes. `__PET_DATA_URI__` is replaced with the inlined
 * PNG data URI and the module is wrapped in the browser module-loader call.
 */
export const UI_TEMPLATE = `/**
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
    const PET = __PET_DATA_URI__;

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
      const symbol = currency === 'USD' ? '$' : '\\u00a5';
      const amount = Number(String(value ?? '').trim());
      if (!Number.isFinite(amount)) return '\\u2014';
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
        : '\\u00a50.00';
      const bonus = bonusWallets.length > 0
        ? bonusWallets.map((wallet) => formatAmount(wallet.balance, wallet.currency)).join(' / ')
        : '\\u2014';

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
`;
