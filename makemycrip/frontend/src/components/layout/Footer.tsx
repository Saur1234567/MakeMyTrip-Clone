import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300 py-12 mt-auto">
      <div className="max-w-7xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-8">
        <div>
          <h3 className="text-white font-bold text-lg mb-4">MakeMyCrip</h3>
          <p className="text-sm text-gray-400">Your trusted travel partner for the best hotel deals across India.</p>
        </div>
        <div>
          <h4 className="text-white font-semibold mb-3">Company</h4>
          <ul className="space-y-2 text-sm">
            <li><Link to="#" className="hover:text-white transition-colors">About Us</Link></li>
            <li><Link to="#" className="hover:text-white transition-colors">Careers</Link></li>
            <li><Link to="#" className="hover:text-white transition-colors">Press</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-white font-semibold mb-3">Support</h4>
          <ul className="space-y-2 text-sm">
            <li><Link to="#" className="hover:text-white transition-colors">Help Center</Link></li>
            <li><Link to="#" className="hover:text-white transition-colors">Contact Us</Link></li>
            <li><Link to="#" className="hover:text-white transition-colors">Privacy Policy</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-white font-semibold mb-3">Connect</h4>
          <p className="text-sm text-gray-400">support@makemycrip.com</p>
          <p className="text-sm text-gray-400 mt-1">1800-123-4567 (Toll Free)</p>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 mt-8 pt-8 border-t border-gray-700 text-sm text-gray-500 text-center">
        © {new Date().getFullYear()} MakeMyCrip. All rights reserved.
      </div>
    </footer>
  )
}
