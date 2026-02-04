import { AppLayout } from '@/components/layout/AppLayout';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

const faqs = [
  {
    question: 'What is KieDex?',
    answer: 'KieDex is a demo futures trading simulator where you can practice perpetual futures trading using Demo USDT (not real money) and earn KDX reward tokens based on your trading activity.',
  },
  {
    question: 'Is the money I trade with real?',
    answer: 'No. You trade with Demo USDT which has no real monetary value. This allows you to practice trading strategies without any financial risk.',
  },
  {
    question: 'How do I earn KDX tokens?',
    answer: 'KDX tokens are distributed daily from a pool of 10,000 KDX. Your share is based on your trading volume score compared to other traders. The more you trade, the more you earn.',
  },
  {
    question: 'Why do I need to connect a wallet?',
    answer: 'You need to connect your own wallet (MetaMask or WalletConnect) on Base network to verify your identity and eventually receive rewards. We never store your private keys.',
  },
  {
    question: 'What are Base ETH fees?',
    answer: 'Base ETH is used to pay small trading fees on the platform. You deposit Base ETH once into your fee balance, and fees are deducted automatically with each trade - no confirmation needed per trade.',
  },
  {
    question: 'How much are the trading fees?',
    answer: 'Trading fees are calculated as 0.00000025 ETH per 50 USDT of position size. For example, a 1000 USDT position would cost 0.000005 ETH in fees.',
  },
  {
    question: 'Can I withdraw KDX tokens?',
    answer: 'Withdrawal functionality will be added in a future update. Currently, KDX tokens are tracked internally and can be claimed daily.',
  },
  {
    question: 'What markets can I trade?',
    answer: 'Currently we support BTC/USDT, ETH/USDT, DOGE/USDT, and TRX/USDT perpetual futures with up to 50x leverage.',
  },
  {
    question: 'How does liquidation work?',
    answer: 'Positions are automatically liquidated when your loss reaches 90% of the margin used. The liquidation price is shown before you open a position.',
  },
  {
    question: 'How does the referral program work?',
    answer: 'Share your unique referral code with friends. When they sign up using your code, both of you receive bonus rewards on your trading activity.',
  },
];

export default function FAQ() {
  return (
    <AppLayout showMobileNav={false}>
      <div className="container py-12 max-w-3xl">
        <h1 className="text-3xl font-bold mb-2">Frequently Asked Questions</h1>
        <p className="text-muted-foreground mb-8">
          Everything you need to know about trading on KieDex
        </p>

        <Accordion type="single" collapsible className="w-full">
          {faqs.map((faq, index) => (
            <AccordionItem key={index} value={`item-${index}`}>
              <AccordionTrigger className="text-left">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </AppLayout>
  );
}
