export function Footer() {
  return (
    <footer className="site-footer on-dark" id="about">
      <div className="container footer-grid">
        <div>
          <h2>CarbonFootprint India</h2>
          <p>A student project for tracking everyday emissions and encouraging practical climate action.</p>
        </div>
        <div>
          <h3>Explore</h3>
          <ul>
            <li>
              <a href="#activities">Log Activity</a>
            </li>
            <li>
              <a href="#insights">Insights</a>
            </li>
            <li>
              <a href="#home">Back to top</a>
            </li>
          </ul>
        </div>
        <div>
          <h3>About the numbers</h3>
          <p>
            Emission factors are illustrative values for this exercise. Records are stored through JSON Server in
            <code> db.json</code>.
          </p>
        </div>
      </div>
      <p className="footer-base">© 2026 CarbonFootprint India · Sustainability &amp; Environment</p>
    </footer>
  );
}
