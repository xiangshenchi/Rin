import { useContext, useEffect, useRef, useState } from 'react';
import Popup from 'reactjs-popup';
import { useLocation } from 'wouter';
import { ClientConfigContext } from '../state/config';
import { Helmet } from "react-helmet";
import { siteName } from '../utils/constants';
import { useTranslation } from "react-i18next";
import { buildLoginPath, HIDDEN_LOGIN_REDIRECT } from "../utils/auth-redirect";

type ThemeMode = 'light' | 'dark' | 'system';

function SiteTimer({ startDate }: { startDate?: string }) {
    const [timeDisplay, setTimeDisplay] = useState('');

    useEffect(() => {
        if (!startDate) return;

        const updateTimer = () => {
            const targetDate = new Date(startDate);
            const today = new Date();
            const diff = today.getTime() - targetDate.getTime();

            const seconds = 1000;
            const minutes = seconds * 60;
            const hours = minutes * 60;
            const days = hours * 24;
            const years = days * 365;

            const totalYears = Math.floor(diff / years);
            let remainingTime = diff % years;
            const diffDays = Math.floor(remainingTime / days);
            remainingTime %= days;
            const diffHours = Math.floor(remainingTime / hours);
            remainingTime %= hours;
            const diffMinutes = Math.floor(remainingTime / minutes);
            remainingTime %= minutes;
            const diffSeconds = Math.floor(remainingTime / seconds);

            setTimeDisplay(`本站已运行 ${totalYears} 年 ${diffDays} 天 ${diffHours} 小时 ${diffMinutes} 分 ${diffSeconds} 秒`);
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
    }, [startDate]);

    if (!startDate) return null;

    return (
        <p className="text-sm text-neutral-500 font-normal">
            {timeDisplay}
        </p>
    );
}

function Footer() {
    const { t } = useTranslation()
    const [, setLocation] = useLocation()
    const [modeState, setModeState] = useState<ThemeMode>('system');
    const config = useContext(ClientConfigContext);
    const footerHtml = config.get<string>('footer');
    const footerHtmlRef = useRef<HTMLDivElement | null>(null);
    const mountedScriptNodesRef = useRef<HTMLScriptElement[]>([]);
    const loginEnabled = config.getBoolean('login.enabled');
    const [doubleClickTimes, setDoubleClickTimes] = useState(0);
    const siteStartDate = config.get<string>('site.start_date');
    const siteIcp = config.get<string>('site.icp');

    useEffect(() => {
        const mode = localStorage.getItem('theme') as ThemeMode || 'system';
        setModeState(mode);
        setMode(mode);
    }, [])

    useEffect(() => {
        const container = footerHtmlRef.current;
        if (!container) {
            return;
        }

        mountedScriptNodesRef.current.forEach((script) => script.remove());
        mountedScriptNodesRef.current = [];
        container.replaceChildren();

        if (!footerHtml) {
            return;
        }

        const template = document.createElement('template');
        template.innerHTML = footerHtml;

        const scripts = Array.from(template.content.querySelectorAll('script'));
        scripts.forEach((script) => script.remove());

        container.appendChild(template.content.cloneNode(true));

        scripts.forEach((script) => {
            const nextScript = document.createElement('script');

            Array.from(script.attributes).forEach((attribute) => {
                nextScript.setAttribute(attribute.name, attribute.value);
            });

            nextScript.textContent = script.textContent;
            container.appendChild(nextScript);
            mountedScriptNodesRef.current.push(nextScript);
        });

        return () => {
            mountedScriptNodesRef.current.forEach((script) => script.remove());
            mountedScriptNodesRef.current = [];
        };
    }, [footerHtml])

    const setMode = (mode: ThemeMode) => {
        setModeState(mode);
        localStorage.setItem('theme', mode);


        if (mode !== 'system' || (!('theme' in localStorage) && window.matchMedia(`(prefers-color-scheme: ${mode})`).matches)) {
            document.documentElement.setAttribute('data-color-mode', mode);
        } else {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
            if (mediaQuery.matches) {
                document.documentElement.setAttribute('data-color-mode', 'dark');
            } else {
                document.documentElement.setAttribute('data-color-mode', 'light');
            }
        }
        window.dispatchEvent(new Event("colorSchemeChange"));
    };

    return (
        <footer>
            <Helmet>
                <link rel="alternate" type="application/rss+xml" title={siteName} href="/rss.xml" />
                <link rel="alternate" type="application/atom+xml" title={siteName} href="/atom.xml" />
                <link rel="alternate" type="application/json" title={siteName} href="/rss.json" />
            </Helmet>
            <div className="flex flex-col mb-8 space-y-2 justify-center items-center t-primary ani-show">
                {/* 用户自定义 HTML */}
                <div ref={footerHtmlRef} />

                {/* 页底布局 - 左中右三栏 */}
                <div className="w-full max-w-5xl px-4">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                        {/* 左侧 - 框架信息 */}
                        <div className="text-center md:text-left">
                            <p className="text-sm text-neutral-500 font-normal">
                                由 <a className='hover:underline' href="https://github.com/openRin/Rin" target="_blank">Rin</a> 驱动
                            </p>
                        </div>

                        {/* 中间 - 版权和网站信息 */}
                        <div className="text-center flex flex-col items-center gap-1">
                            <p className="text-sm text-neutral-500 font-normal">
                                已经到底了哦~
                            </p>
                            <p className="text-sm text-neutral-500 font-normal link-line">
                                <span onDoubleClick={() => {
                                    if(doubleClickTimes >= 2){ // actually need 3 times doubleClick
                                        setDoubleClickTimes(0)
                                        if(!loginEnabled) {
                                            setLocation(buildLoginPath(HIDDEN_LOGIN_REDIRECT))
                                        }
                                    } else {
                                        setDoubleClickTimes(doubleClickTimes + 1)
                                    }
                                }}>
                                    © {new Date().getFullYear()} {config.get<string>('site.name') || siteName}
                                </span>
                                {config.getBoolean('rss') && <>
                                    <Spliter />
                                    <Popup trigger={
                                        <button className="hover:underline" type="button">
                                            RSS
                                        </button>
                                    }
                                        position="top center"
                                        arrow={false}
                                        closeOnDocumentClick>
                                        <div className="border-card">
                                            <p className='font-bold t-primary'>
                                                {t('footer.rss')}
                                            </p>
                                            <p>
                                                <a href='/rss.xml'>
                                                    RSS
                                                </a> <Spliter />
                                                <a href='/atom.xml'>
                                                    Atom
                                                </a> <Spliter />
                                                <a href='/rss.json'>
                                                    JSON
                                                </a>
                                            </p>
                                        </div>
                                    </Popup>
                                </>}
                            </p>
                            {/* ICP 备案号 */}
                            {siteIcp && (
                                <p className="text-sm text-neutral-500 font-normal">
                                    <a className='hover:underline' href="https://beian.miit.gov.cn/" target="_blank">{siteIcp}</a>
                                </p>
                            )}
                            {/* 网站运行时间 */}
                            <SiteTimer startDate={siteStartDate} />
                        </div>

                        {/* 右侧 - 主题切换按钮 */}
                        <div className="text-center md:text-right">
                            <div className="w-fit-content inline-flex rounded-full border border-zinc-200 p-[3px] dark:border-zinc-700">
                                <ThemeButton mode='light' current={modeState} label="Toggle light mode" icon="ri-sun-line" onClick={setMode} />
                                <ThemeButton mode='system' current={modeState} label="Toggle system mode" icon="ri-computer-line" onClick={setMode} />
                                <ThemeButton mode='dark' current={modeState} label="Toggle dark mode" icon="ri-moon-line" onClick={setMode} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
}

function Spliter() {
    return (<span className='px-1'>
        |
    </span>
    )
}

function ThemeButton({ current, mode, label, icon, onClick }: { current: ThemeMode, label: string, mode: ThemeMode, icon: string, onClick: (mode: ThemeMode) => void }) {
    return (<button aria-label={label} type="button" onClick={() => onClick(mode)}
        className={`rounded-inherit inline-flex h-[32px] w-[32px] items-center justify-center border-0 t-primary ${current === mode ? "bg-w rounded-full shadow-xl shadow-light" : ""}`}>
        <i className={`${icon}`} />
    </button>)
}

export default Footer;
