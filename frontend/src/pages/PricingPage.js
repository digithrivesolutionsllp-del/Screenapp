import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Minus, ArrowRight, Star, Zap, Shield, Users } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../components/ui/accordion';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { pricingPlans, comparisonFeatures, faqs } from '../data/mock';

const BRAND_BLUE = '#4175F5';

const PricingCard = ({ plan, isYearly }) => {
  const navigate = useNavigate();
  const price = isYearly ? plan.yearlyPrice : plan.monthlyPrice;
  return (
    <div className={`relative bg-white rounded-2xl p-8 flex flex-col ${plan.popular ? 'ring-2 shadow-xl' : 'border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200'}`}
      style={plan.popular ? { ringColor: BRAND_BLUE } : {}}>
      {plan.popular && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
          <span className="text-white text-xs font-bold px-4 py-1.5 rounded-full" style={{background: BRAND_BLUE}}>Most Popular</span>
        </div>
      )}
      <div className="mb-6">
        <h3 className="text-lg font-bold text-gray-900 mb-1">{plan.name}</h3>
        <p className="text-sm text-gray-500">{plan.description}</p>
      </div>
      <div className="mb-6">
        <div className="flex items-end gap-1">
          <span className="text-xl font-semibold text-gray-900">$</span>
          <span className="text-5xl font-extrabold text-gray-900">{price}</span>
          <span className="text-gray-500 text-sm mb-1.5">/mo</span>
        </div>
        {isYearly && plan.yearlyPrice > 0 && (
          <p className="text-xs text-gray-400 mt-1">billed annually</p>
        )}
      </div>
      <ul className="space-y-3 mb-8 flex-1">
        {plan.features.map(f=>(
          <li key={f} className="flex items-start gap-2.5">
            <Check className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
            <span className="text-sm text-gray-600">{f}</span>
          </li>
        ))}
      </ul>
      <button
        onClick={() => navigate('/app')}
        className={`w-full py-3 rounded-xl text-sm font-semibold transition-opacity duration-150 ${plan.popular ? 'text-white hover:opacity-90' : 'border border-gray-200 text-gray-900 hover:bg-gray-50 transition-colors duration-150'}`}
        style={plan.popular ? {background: BRAND_BLUE} : {}}
      >
        {plan.cta}
      </button>
      {plan.note && <p className="text-xs text-gray-400 text-center mt-3">{plan.note}</p>}
    </div>
  );
};

const CellValue = ({ val }) => {
  if (val === true) return <Check className="w-4 h-4 text-emerald-500 mx-auto" />;
  if (val === false) return <Minus className="w-4 h-4 text-gray-300 mx-auto" />;
  return <span className="text-xs text-gray-600">{val}</span>;
};

const PricingPage = () => {
  const [isYearly, setIsYearly] = useState(true);
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Hero */}
      <section className="pt-28 pb-12 px-4 text-center">
        <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-3">Simple, transparent pricing</h1>
        <p className="text-gray-500 text-lg">No credit card required, cancel anytime</p>
        
        {/* Toggle */}
        <div className="flex items-center justify-center gap-3 mt-8">
          <span className={`text-sm font-medium ${!isYearly ? 'text-gray-900' : 'text-gray-400'}`}>Monthly</span>
          <button
            onClick={() => setIsYearly(!isYearly)}
            className={`relative w-12 h-6 rounded-full transition-colors duration-200`}
            style={{background: isYearly ? BRAND_BLUE : '#D1D5DB'}}
          >
            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${isYearly ? 'translate-x-7' : 'translate-x-1'}`} />
          </button>
          <span className={`text-sm font-medium flex items-center gap-1.5 ${isYearly ? 'text-gray-900' : 'text-gray-400'}`}>
            Yearly
            <span className="bg-emerald-100 text-emerald-700 text-xs font-semibold px-2 py-0.5 rounded-full">Save 20%</span>
          </span>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="px-4 sm:px-6 lg:px-8 pb-16">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          {pricingPlans.map(plan=><PricingCard key={plan.id} plan={plan} isYearly={isYearly} />)}
        </div>
      </section>

      {/* Enterprise Banner */}
      <section className="py-14 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">Ready to Scale Your Team?</h2>
            <p className="text-gray-500">For organizations that need scalability, control, and security.</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 p-8 grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { Icon: Shield, title: "Enterprise Security", desc: "SOC 2 Type II certified, GDPR compliant, SAML SSO, enterprise-grade encryption." },
              { Icon: Zap, title: "Unlimited Scale", desc: "Unlimited recordings, users, and usage across your entire organization." },
              { Icon: Users, title: "Dedicated Support", desc: "Custom integrations, full API access, and dedicated customer success manager." }
            ].map(({Icon, title, desc})=>(
              <div key={title} className="flex flex-col items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                  <Icon className="w-5 h-5" style={{color: BRAND_BLUE}} />
                </div>
                <h3 className="font-bold text-gray-900">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-8">
            <p className="text-gray-500 text-sm mb-4">Starting at <strong className="text-gray-900">$199/month</strong> · Custom pricing based on your team size</p>
            <a href="mailto:sales@screenapp.io" className="inline-flex items-center gap-2 text-sm font-semibold text-white px-6 py-3 rounded-full hover:opacity-90 transition-opacity duration-150" style={{background: BRAND_BLUE}}>
              Get in Touch <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 text-center mb-10">Compare All Features</h2>
          <div className="overflow-x-auto rounded-2xl border border-gray-200 shadow-sm">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left p-4 text-sm font-semibold text-gray-900 w-2/5">Features</th>
                  {['Free','Growth','Business'].map(h=>(
                    <th key={h} className="text-center p-4 text-sm font-semibold text-gray-900">
                      {h === 'Growth' ? <span style={{color:BRAND_BLUE}}>{h}</span> : h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {comparisonFeatures.map(cat=>(
                  <React.Fragment key={cat.category}>
                    <tr className="bg-gray-50/80">
                      <td colSpan={4} className="px-4 py-2.5 text-xs font-bold text-gray-500 uppercase tracking-wider">{cat.category}</td>
                    </tr>
                    {cat.features.map(f=>(
                      <tr key={f.name} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors duration-150">
                        <td className="p-4 text-sm text-gray-700">{f.name}</td>
                        <td className="p-4 text-center"><CellValue val={f.free} /></td>
                        <td className="p-4 text-center"><CellValue val={f.growth} /></td>
                        <td className="p-4 text-center"><CellValue val={f.business} /></td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-14 px-4 sm:px-6 lg:px-8 bg-gray-50/50">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 text-center mb-8">Frequently Asked Questions</h2>
          <Accordion type="single" collapsible className="space-y-2">
            {faqs.slice(0,6).map((faq,i)=>(
              <AccordionItem key={i} value={`pfaq-${i}`} className="bg-white border border-gray-100 rounded-xl px-5 shadow-sm">
                <AccordionTrigger className="text-sm font-semibold text-gray-900 hover:no-underline py-4 text-left">{faq.q}</AccordionTrigger>
                <AccordionContent className="text-sm text-gray-500 pb-4 leading-relaxed">{faq.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 text-center">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="flex -space-x-2">
              {['A','J','S'].map((l,i)=>(
                <div key={i} className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-xs font-bold text-white" style={{background:['#4175F5','#7C3AED','#10B981'][i]}}>{l}</div>
              ))}
            </div>
            <span className="text-sm text-gray-500">Join 2,147,483+ users</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">Start Recording for Free Today</h2>
          <p className="text-gray-500 mb-6">Join 2M+ users transforming their recordings into insights</p>
          <button onClick={() => navigate('/app')} className="inline-flex items-center gap-2 text-white font-semibold px-8 py-3.5 rounded-full hover:opacity-90 transition-opacity duration-150" style={{background: BRAND_BLUE}}>
            Start free <ArrowRight className="w-4 h-4" />
          </button>
          <p className="text-gray-400 text-sm mt-3">Get started in 60 seconds • No credit card required</p>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default PricingPage;
