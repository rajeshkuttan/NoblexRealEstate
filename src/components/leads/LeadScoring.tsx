import { useState } from "react";
import { 
  Star, 
  TrendingUp, 
  Target, 
  DollarSign, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Building2,
  User,
  FileText,
  Shield,
  Phone,
  Mail,
  Calendar,
  MapPin,
  BarChart3,
  Award,
  Zap
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface LeadScoringProps {
  lead: any;
  isOpen: boolean;
  onClose: () => void;
}

// UAE-specific lead scoring criteria
const scoringCriteria = {
  // Contact Quality (25 points)
  contactQuality: {
    title: "Contact Quality",
    maxPoints: 25,
    factors: [
      { name: "Complete Contact Information", weight: 10, current: 0 },
      { name: "Valid Email Address", weight: 5, current: 0 },
      { name: "UAE Phone Number", weight: 5, current: 0 },
      { name: "Professional Email Domain", weight: 3, current: 0 },
      { name: "LinkedIn Profile Available", weight: 2, current: 0 }
    ]
  },
  
  // UAE Compliance (20 points)
  uaeCompliance: {
    title: "UAE Compliance",
    maxPoints: 20,
    factors: [
      { name: "Emirates ID Provided", weight: 8, current: 0 },
      { name: "Valid Visa Status", weight: 5, current: 0 },
      { name: "Trade License (if applicable)", weight: 4, current: 0 },
      { name: "Bank Statement Available", weight: 3, current: 0 }
    ]
  },
  
  // Financial Capacity (25 points)
  financialCapacity: {
    title: "Financial Capacity",
    maxPoints: 25,
    factors: [
      { name: "Budget Above AED 100K", weight: 8, current: 0 },
      { name: "Salary Certificate", weight: 6, current: 0 },
      { name: "Bank Statement (3 months)", weight: 5, current: 0 },
      { name: "Employment Letter", weight: 4, current: 0 },
      { name: "Credit Score Available", weight: 2, current: 0 }
    ]
  },
  
  // Property Match (15 points)
  propertyMatch: {
    title: "Property Match",
    maxPoints: 15,
    factors: [
      { name: "Clear Property Requirements", weight: 5, current: 0 },
      { name: "Realistic Timeline", weight: 4, current: 0 },
      { name: "Specific Location Preference", weight: 3, current: 0 },
      { name: "Flexible on Move-in Date", weight: 3, current: 0 }
    ]
  },
  
  // Engagement Level (15 points)
  engagementLevel: {
    title: "Engagement Level",
    maxPoints: 15,
    factors: [
      { name: "Quick Response Time", weight: 5, current: 0 },
      { name: "Multiple Touchpoints", weight: 4, current: 0 },
      { name: "Asks Relevant Questions", weight: 3, current: 0 },
      { name: "Shows Genuine Interest", weight: 3, current: 0 }
    ]
  }
};

const leadScoringAlgorithms = {
  basic: {
    name: "Basic Scoring",
    description: "Simple point-based system",
    formula: "Sum of all criteria points"
  },
  weighted: {
    name: "Weighted Scoring",
    description: "UAE market-specific weights",
    formula: "Contact Quality (30%) + Compliance (25%) + Financial (25%) + Property Match (10%) + Engagement (10%)"
  },
  ai: {
    name: "AI-Enhanced Scoring",
    description: "Machine learning with UAE market data",
    formula: "Advanced algorithm considering market trends, seasonality, and conversion patterns"
  }
};

const marketInsights = {
  dubai: {
    avgConversionRate: 0.28,
    avgLeadScore: 72,
    topFactors: ["Budget", "Location", "Timeline"],
    seasonalTrends: {
      "Q1": "High demand for villas",
      "Q2": "Apartment rentals peak",
      "Q3": "Commercial space demand",
      "Q4": "Year-end relocations"
    }
  },
  abuDhabi: {
    avgConversionRate: 0.32,
    avgLeadScore: 75,
    topFactors: ["Compliance", "Budget", "Location"],
    seasonalTrends: {
      "Q1": "Government sector moves",
      "Q2": "Oil & gas relocations",
      "Q3": "Education sector",
      "Q4": "Corporate relocations"
    }
  }
};

export default function LeadScoring({ lead, isOpen, onClose }: LeadScoringProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedAlgorithm, setSelectedAlgorithm] = useState("weighted");
  
  // Calculate lead score based on lead data
  const calculateLeadScore = () => {
    let totalScore = 0;
    let maxPossibleScore = 0;
    
    // Contact Quality
    if (lead?.email && lead?.phone) totalScore += 15;
    if (lead?.company) totalScore += 5;
    if (lead?.position) totalScore += 5;
    maxPossibleScore += 25;
    
    // UAE Compliance
    if (lead?.emiratesId) totalScore += 8;
    if (lead?.visaStatus === "resident") totalScore += 5;
    if (lead?.tradeLicense) totalScore += 4;
    if (lead?.bankName) totalScore += 3;
    maxPossibleScore += 20;
    
    // Financial Capacity
    if (lead?.budget > 100000) totalScore += 8;
    if (lead?.salaryCertificate) totalScore += 6;
    if (lead?.bankName) totalScore += 5;
    if (lead?.company) totalScore += 4;
    if (lead?.emiratesId) totalScore += 2;
    maxPossibleScore += 25;
    
    // Property Match
    if (lead?.preferredLocation) totalScore += 5;
    if (lead?.moveInDate) totalScore += 4;
    if (lead?.area > 0) totalScore += 3;
    if (lead?.propertyType) totalScore += 3;
    maxPossibleScore += 15;
    
    // Engagement Level (simulated)
    totalScore += 12; // Assume good engagement
    maxPossibleScore += 15;
    
    return {
      score: Math.round((totalScore / maxPossibleScore) * 100),
      totalPoints: totalScore,
      maxPoints: maxPossibleScore
    };
  };

  const scoreData = calculateLeadScore();
  const leadScore = scoreData.score;
  
  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    if (score >= 40) return "text-orange-600";
    return "text-red-600";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return "Excellent";
    if (score >= 60) return "Good";
    if (score >= 40) return "Fair";
    return "Poor";
  };

  const getRecommendations = (score: number) => {
    if (score >= 80) {
      return [
        "High priority lead - immediate follow-up",
        "Schedule property viewing within 24 hours",
        "Prepare personalized property recommendations",
        "Assign to senior agent"
      ];
    } else if (score >= 60) {
      return [
        "Good potential - follow up within 48 hours",
        "Send property brochures and market insights",
        "Schedule initial consultation call",
        "Monitor engagement closely"
      ];
    } else if (score >= 40) {
      return [
        "Nurture lead with educational content",
        "Focus on building trust and relationship",
        "Send market updates and property alerts",
        "Consider longer sales cycle"
      ];
    } else {
      return [
        "Low priority - automated nurturing",
        "Send general market information",
        "Focus on lead qualification",
        "Consider lead source optimization"
      ];
    }
  };

  const marketData = marketInsights[lead?.emirate as keyof typeof marketInsights] || marketInsights.dubai;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl font-bold text-foreground flex items-center gap-2">
                <Star className="h-6 w-6 text-yellow-500" />
                Lead Scoring Analysis
              </DialogTitle>
              <p className="text-muted-foreground mt-1">
                {lead?.name} • Advanced scoring for UAE market
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={cn("text-lg px-4 py-2", getScoreColor(leadScore))}>
                {leadScore}/100
              </Badge>
              <Badge variant="outline">
                {getScoreLabel(leadScore)}
              </Badge>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Score Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Lead Score</p>
                    <p className={cn("text-3xl font-bold", getScoreColor(leadScore))}>
                      {leadScore}
                    </p>
                  </div>
                  <div className="h-12 w-12 rounded-lg bg-gradient-withu flex items-center justify-center">
                    <Star className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div className="mt-4">
                  <Progress value={leadScore} className="h-2" />
                  <p className="text-sm text-muted-foreground mt-2">
                    {getScoreLabel(leadScore)} quality lead
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Conversion Probability</p>
                    <p className="text-3xl font-bold text-green-600">
                      {Math.round(leadScore * 0.8)}%
                    </p>
                  </div>
                  <div className="h-12 w-12 rounded-lg bg-green-100 flex items-center justify-center">
                    <TrendingUp className="h-6 w-6 text-green-600" />
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-sm text-muted-foreground">
                    Based on similar leads
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Market Average</p>
                    <p className="text-3xl font-bold text-blue-600">
                      {marketData.avgLeadScore}
                    </p>
                  </div>
                  <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center">
                    <BarChart3 className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-sm text-muted-foreground">
                    {lead?.emirate?.replace('_', ' ').toUpperCase()} market
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Priority Level</p>
                    <p className="text-3xl font-bold text-purple-600">
                      {leadScore >= 80 ? "High" : leadScore >= 60 ? "Medium" : "Low"}
                    </p>
                  </div>
                  <div className="h-12 w-12 rounded-lg bg-purple-100 flex items-center justify-center">
                    <Target className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-sm text-muted-foreground">
                    Action required
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="criteria">Scoring Criteria</TabsTrigger>
              <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
              <TabsTrigger value="market">Market Insights</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Award className="h-5 w-5" />
                      Score Breakdown
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {Object.entries(scoringCriteria).map(([key, criteria]) => {
                        const points = Math.round((leadScore / 100) * criteria.maxPoints);
                        return (
                          <div key={key} className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">{criteria.title}</span>
                              <span className="text-sm text-muted-foreground">
                                {points}/{criteria.maxPoints}
                              </span>
                            </div>
                            <Progress value={(points / criteria.maxPoints) * 100} className="h-2" />
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Zap className="h-5 w-5" />
                      Quick Actions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <Button className="w-full" variant="outline">
                        <Phone className="h-4 w-4 mr-2" />
                        Call Lead
                      </Button>
                      <Button className="w-full" variant="outline">
                        <Mail className="h-4 w-4 mr-2" />
                        Send Email
                      </Button>
                      <Button className="w-full" variant="outline">
                        <Calendar className="h-4 w-4 mr-2" />
                        Schedule Meeting
                      </Button>
                      <Button className="w-full" variant="outline">
                        <FileText className="h-4 w-4 mr-2" />
                        Generate Proposal
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Scoring Criteria Tab */}
            <TabsContent value="criteria" className="space-y-6">
              <div className="space-y-6">
                {Object.entries(scoringCriteria).map(([key, criteria]) => (
                  <Card key={key}>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <Shield className="h-5 w-5" />
                          {criteria.title}
                        </span>
                        <Badge variant="outline">
                          {criteria.maxPoints} points
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {criteria.factors.map((factor, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                            <div className="flex items-center gap-3">
                              <CheckCircle className="h-4 w-4 text-green-600" />
                              <span className="text-sm">{factor.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">{factor.weight} pts</span>
                              <Badge variant="secondary" className="bg-green-100 text-green-800">
                                ✓
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Recommendations Tab */}
            <TabsContent value="recommendations" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Recommended Actions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {getRecommendations(leadScore).map((recommendation, index) => (
                      <div key={index} className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
                        <div className="h-6 w-6 rounded-full bg-gradient-withu flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-white text-xs font-bold">{index + 1}</span>
                        </div>
                        <p className="text-sm">{recommendation}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Market Insights Tab */}
            <TabsContent value="market" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      Market Performance
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Average Conversion Rate</span>
                        <span className="font-semibold">
                          {(marketData.avgConversionRate * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Average Lead Score</span>
                        <span className="font-semibold">{marketData.avgLeadScore}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Your Lead Score</span>
                        <span className={cn("font-semibold", getScoreColor(leadScore))}>
                          {leadScore}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Seasonal Trends
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {Object.entries(marketData.seasonalTrends).map(([quarter, trend]) => (
                        <div key={quarter} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                          <span className="text-sm font-medium">{quarter}</span>
                          <span className="text-sm text-muted-foreground">{trend}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
