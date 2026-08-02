// Page content layout

import UpdatesDashboard from "@/components/UpdatesDashboard";

export default function HomePage() {
    return (
        <main>
            <header className="hero">
                <div className="hero-content">
                    <div className="hero-title-row">
                        <img
                            src="/t1d-ribbon.webp"
                            alt="Type 1 diabetes ribbon"
                            className="hero-ribbon"
                        />

                        <div className="hero-text">
                            <p className="eyebrow">
                                RESEARCH - TRIALS - WORLDWIDE
                            </p>

                            <h1>
                                Type 1 Diabetes Updates
                            </h1>

                            <p className="hero-copy">
                                Explore recently published Type 1
                                diabetes research and updated clinical
                                trials from trusted medical databases.
                            </p>
                        </div>

                        <img
                            src="/t1d-ribbon.webp"
                            alt=""
                            aria-hidden="true"
                            className="hero-ribbon"
                        />
                    </div>
                </div>
            </header>

            <UpdatesDashboard />
        </main>
    )
}